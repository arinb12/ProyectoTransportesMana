(function () {
    'use strict';

    // ============================================
    // MODULE STATE
    // ============================================
    let dataTableInstance = null;
    let isPageLoaded = false;

    // Mobile pagination state using common structure
    const mobileState = {
        allUsuarios: [],
        filteredUsuarios: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        filterEstado: '',
        filterRol: ''
    };

    // DOM Elements (cached on init)
    const DOM = {
        modal: null,
        form: null,
        loadingOverlay: null,
        // Mobile elements
        usuarioCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobileFilterRol: null,
        mobilePageSize: null,
        mobilePagination: null
    };

    // Status labels for usuarios
    const STATUS_LABELS = { active: 'Activo', inactive: 'Inactivo' };

    // ============================================
    // LOCAL UTILITY WRAPPERS
    // ============================================

    function showLoading(show = true, message = null) {
        GestionCommon.showLoading(DOM.loadingOverlay, show, message);
    }

    function showNotification(type, title, text, toast = false) {
        GestionCommon.showNotification(type, title, text, toast);
    }

    function isMobileView() {
        return GestionCommon.isMobileView();
    }

    function escapeHtml(str) {
        return GestionCommon.escapeHtml(str);
    }

    function escapeAttr(str) {
        return GestionCommon.escapeAttr(str);
    }

    function getAntiForgeryToken() {
        return GestionCommon.getAntiForgeryToken();
    }

    // ============================================
    // STATS UPDATE
    // ============================================

    function updateStats(data) {
        const total = data?.length || 0;
        const activos = data?.filter(u => u.activo === true).length || 0;
        const roles = [...new Set(data?.map(u => u.rolNombre).filter(Boolean))].length || 0;

        const totalEl = document.getElementById('stats-total-usuarios');
        const activosEl = document.getElementById('stats-usuarios-activos');
        const rolesEl = document.getElementById('stats-roles');

        if (totalEl) totalEl.textContent = total;
        if (activosEl) activosEl.textContent = activos;
        if (rolesEl) rolesEl.textContent = roles;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initPage() {
        // Cache DOM elements
        DOM.modal = document.getElementById('modalUsuario');
        DOM.form = document.getElementById('usuarioForm');
        DOM.loadingOverlay = document.getElementById('loading-overlay');

        // Mobile elements
        DOM.usuarioCardsContainer = document.getElementById('usuarioCardsContainer');
        DOM.mobileSearch = document.getElementById('mobileSearchUsuarios');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstado');
        DOM.mobileFilterRol = document.getElementById('mobileFilterRol');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById('mobilePaginationUsuarios');

        // Load data from window object (passed from Razor view)
        if (window.UsuariosData) {
            mobileState.allUsuarios = window.UsuariosData;
            mobileState.filteredUsuarios = [...mobileState.allUsuarios];
            updateStats(mobileState.allUsuarios);
        }

        // Initialize DataTable for desktop
        initDataTableInstance();

        // Initialize role filter buttons
        initRoleFilterButtons();

        // Modal events
        if (DOM.modal) {
            DOM.modal.addEventListener('shown.bs.modal', onModalShown);
            DOM.modal.addEventListener('hidden.bs.modal', onModalHidden);
        }

        // Form submit handler
        if (DOM.form) {
            DOM.form.addEventListener('submit', handleFormSubmit);
        }

        // Password toggle handlers
        initPasswordToggles();

        // Attach mobile event handlers
        attachMobileEventHandlers();

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Initial render for mobile if needed
        if (isMobileView()) {
            renderMobileUsuarioCards();
        }

        isPageLoaded = true;
    }

    // ============================================
    // DATATABLE INITIALIZATION
    // ============================================

    function initDataTableInstance() {
        dataTableInstance = GestionCommon.initDataTableInstance('tablaUsuarios', [4, 5], {
            order: [[0, 'asc']],
            pageLength: 10
        });
    }

    // ============================================
    // ROLE FILTER BUTTONS (DESKTOP)
    // ============================================

    function initRoleFilterButtons() {
        document.querySelectorAll('.filtro-rol').forEach(btn => {
            btn.addEventListener('click', function () {
                const rol = this.dataset.rol;

                // Update button states
                document.querySelectorAll('.filtro-rol').forEach(b => {
                    b.classList.remove('tm-btn-primary', 'active');
                    b.classList.add('tm-btn-outline');
                });
                this.classList.remove('tm-btn-outline');
                this.classList.add('tm-btn-primary', 'active');

                // Filter DataTable
                if (dataTableInstance) {
                    if (!rol) {
                        dataTableInstance.column(1).search('').draw();
                    } else {
                        dataTableInstance.column(1).search('^' + rol + '$', true, false).draw();
                    }
                }
            });
        });
    }

    // ============================================
    // PASSWORD TOGGLE
    // ============================================

    function initPasswordToggles() {
        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const contrasenaInput = document.getElementById('Contrasena');
        const confirmarInput = document.getElementById('ConfirmarContrasena');

        if (togglePassword && contrasenaInput) {
            togglePassword.addEventListener('click', function () {
                const type = contrasenaInput.type === 'password' ? 'text' : 'password';
                contrasenaInput.type = type;
                this.querySelector('i').classList.toggle('bi-eye');
                this.querySelector('i').classList.toggle('bi-eye-slash');
            });
        }

        if (toggleConfirmPassword && confirmarInput) {
            toggleConfirmPassword.addEventListener('click', function () {
                const type = confirmarInput.type === 'password' ? 'text' : 'password';
                confirmarInput.type = type;
                this.querySelector('i').classList.toggle('bi-eye');
                this.querySelector('i').classList.toggle('bi-eye-slash');
            });
        }
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterUsuarios() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;
        const filterRol = mobileState.filterRol;

        mobileState.filteredUsuarios = mobileState.allUsuarios.filter(usuario => {
            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const nombreCompleto = (usuario.nombreCompleto || '').toLowerCase();
                const correo = (usuario.correo || '').toLowerCase();
                const rolNombre = (usuario.rolNombre || '').toLowerCase();

                matchesSearch = nombreCompleto.includes(searchTerm) ||
                    correo.includes(searchTerm) ||
                    rolNombre.includes(searchTerm);
            }

            // Status filter
            let matchesStatus = true;
            if (filterEstado === 'activo') {
                matchesStatus = usuario.activo === true;
            } else if (filterEstado === 'inactivo') {
                matchesStatus = usuario.activo === false;
            }

            // Role filter
            let matchesRol = true;
            if (filterRol) {
                matchesRol = usuario.rolNombre === filterRol;
            }

            return matchesSearch && matchesStatus && matchesRol;
        });

        mobileState.currentPage = 1;
    }

    function getPagedUsuarios() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredUsuarios.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredUsuarios.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileUsuarioCards();

        if (DOM.usuarioCardsContainer) {
            DOM.usuarioCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.goToPageUsuarios = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function getRolBadgeClass(rolNombre) {
        if (!rolNombre) return '';
        const rol = rolNombre.toLowerCase();
        if (rol === 'admin' || rol === 'administrador') return 'admin';
        if (rol === 'encargado') return 'encargado';
        if (rol === 'maestra') return 'maestra';
        if (rol === 'estudiante') return 'estudiante';
        if (rol === 'asistente') return 'asistente';
        return '';
    }

    function createUsuarioCardHtml(usuario) {
        const statusClass = usuario.activo ? 'active' : 'inactive';
        const statusBadge = GestionCommon.createStatusBadgeHtml(usuario.activo, STATUS_LABELS);
        const rolBadgeClass = getRolBadgeClass(usuario.rolNombre);

        return `
            <div class="tm-usuario-card ${statusClass}" data-id="${usuario.idUsuario}">
                <div class="tm-usuario-card-header" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#usuario-details-${usuario.idUsuario}" 
                     aria-expanded="false"
                     aria-controls="usuario-details-${usuario.idUsuario}">
                    <div class="tm-usuario-info">
                        <div class="tm-usuario-title-row">
                            <span class="tm-usuario-name">${escapeHtml(usuario.nombreCompleto)}</span>
                            ${statusBadge}
                        </div>
                        <div class="tm-usuario-meta">
                            <span class="tm-rol-badge ${rolBadgeClass}">
                                <i class="bi bi-shield"></i>
                                ${escapeHtml(usuario.rolNombre || 'Sin rol')}
                            </span>
                            <span class="tm-usuario-meta-item">
                                <i class="bi bi-envelope"></i>
                                ${escapeHtml(usuario.correo || 'Sin correo')}
                            </span>
                        </div>
                    </div>
                    <div class="tm-usuario-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="usuario-details-${usuario.idUsuario}">
                    <div class="tm-usuario-card-body">
                        <div class="tm-usuario-details">
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Nombre</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.nombre || '—')}</span>
                            </div>
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Primer Apellido</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.primerApellido || '—')}</span>
                            </div>
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Segundo Apellido</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.segundoApellido || '—')}</span>
                            </div>
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Correo</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.correo || '—')}</span>
                            </div>
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Rol</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.rolNombre || '—')}</span>
                            </div>
                            <div class="tm-usuario-detail-item">
                                <span class="tm-usuario-detail-label">Fecha Registro</span>
                                <span class="tm-usuario-detail-value">${escapeHtml(usuario.fechaRegistro || '—')}</span>
                            </div>
                        </div>
                        <div class="tm-usuario-actions">
                            <div class="tm-usuario-actions-left">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           role="switch"
                                           id="mobile-estado-${usuario.idUsuario}"
                                           ${usuario.activo ? 'checked' : ''}
                                           onchange="cambiarEstadoUsuario(${usuario.idUsuario}, this.checked)">
                                    <label class="form-check-label small" for="mobile-estado-${usuario.idUsuario}">
                                        ${usuario.activo ? 'Activo' : 'Inactivo'}
                                    </label>
                                </div>
                            </div>
                            <div class="tm-usuario-actions-right">
                                <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                        onclick="editarUsuario(${usuario.idUsuario})"
                                        title="Editar">
                                    <i class="bi bi-pencil me-1"></i>
                                    Editar
                                </button>
                                <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                        onclick="eliminarUsuario(${usuario.idUsuario}, '${escapeAttr(usuario.nombreCompleto)}')"
                                        title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createEmptyStateHtml() {
        const state = {
            searchTerm: mobileState.searchTerm,
            filterEstado: mobileState.filterEstado || mobileState.filterRol
        };

        return GestionCommon.createEmptyStateHtml(state, {
            iconFiltered: 'bi-search',
            iconEmpty: 'bi-people',
            messageFiltered: 'No se encontraron usuarios',
            messageEmpty: 'No hay usuarios registrados',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Haga clic en "Nuevo Usuario" para agregar uno'
        });
    }

    function createPaginationHtml() {
        const totalUsuarios = mobileState.filteredUsuarios.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalUsuarios === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalUsuarios);

        let pageNumbers = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers += `
                <button type="button" 
                        class="tm-page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPageUsuarios(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalUsuarios}</strong> usuarios
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageUsuarios(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageUsuarios(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileUsuarioCards() {
        if (!DOM.usuarioCardsContainer) return;

        const pagedUsuarios = getPagedUsuarios();

        if (pagedUsuarios.length === 0) {
            DOM.usuarioCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.usuarioCardsContainer.innerHTML = pagedUsuarios
                .map(usuario => createUsuarioCardHtml(usuario))
                .join('');
        }

        if (DOM.mobilePagination) {
            if (mobileState.filteredUsuarios.length > 0) {
                DOM.mobilePagination.innerHTML = createPaginationHtml();
                DOM.mobilePagination.style.display = '';
            } else {
                DOM.mobilePagination.innerHTML = '';
                DOM.mobilePagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // FORM HANDLING
    // ============================================

    function nuevoUsuario() {
        document.getElementById('IdUsuario').value = '0';
        document.getElementById('Nombre').value = '';
        document.getElementById('PrimerApellido').value = '';
        document.getElementById('SegundoApellido').value = '';
        document.getElementById('Correo').value = '';
        document.getElementById('RolId').value = document.getElementById('RolId').options[0]?.value || '';
        document.getElementById('Activo').value = 'true';
        document.getElementById('Contrasena').value = '';
        document.getElementById('ConfirmarContrasena').value = '';

        // Show password required indicators for new user
        const contrasenaRequired = document.getElementById('contrasenaRequired');
        const confirmarRequired = document.getElementById('confirmarRequired');
        const contrasenaHint = document.getElementById('contrasenaHint');

        if (contrasenaRequired) contrasenaRequired.style.display = '';
        if (confirmarRequired) confirmarRequired.style.display = '';
        if (contrasenaHint) contrasenaHint.style.display = 'none';

        document.getElementById('modalUsuarioLabel').innerHTML = '<i class="bi bi-person-plus me-2"></i>Registrar Usuario';

        // Clear validation states
        const form = document.getElementById('usuarioForm');
        if (form) {
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        }
    }

    window.nuevoUsuario = nuevoUsuario;

    async function editarUsuario(id) {
        showLoading(true, 'Cargando datos del usuario...');

        try {
            const response = await fetch(`${window.UsuariosUrls.obtenerParaEditar}?id=${id}`);
            const json = await response.json();

            if (!json.ok) {
                showLoading(false);
                showNotification('error', 'Error', json.message || 'No se pudo cargar el usuario');
                return;
            }

            const u = json.data;

            document.getElementById('IdUsuario').value = u.idUsuario;
            document.getElementById('Nombre').value = u.nombre || '';
            document.getElementById('PrimerApellido').value = u.primerApellido || '';
            document.getElementById('SegundoApellido').value = u.segundoApellido || '';
            document.getElementById('Correo').value = u.correo || '';
            document.getElementById('RolId').value = String(u.rolId || '');
            document.getElementById('Activo').value = u.activo ? 'true' : 'false';
            document.getElementById('Contrasena').value = '';
            document.getElementById('ConfirmarContrasena').value = '';

            // Hide password required indicators for edit
            const contrasenaRequired = document.getElementById('contrasenaRequired');
            const confirmarRequired = document.getElementById('confirmarRequired');
            const contrasenaHint = document.getElementById('contrasenaHint');

            if (contrasenaRequired) contrasenaRequired.style.display = 'none';
            if (confirmarRequired) confirmarRequired.style.display = 'none';
            if (contrasenaHint) contrasenaHint.style.display = '';

            document.getElementById('modalUsuarioLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Usuario';

            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUsuario'));
            modal.show();
            showLoading(false);
        } catch (error) {
            showLoading(false);
            console.error('Error loading usuario:', error);
            showNotification('error', 'Error', 'No se pudo cargar la información del usuario');
        }
    }

    window.editarUsuario = editarUsuario;

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = parseInt(document.getElementById('IdUsuario').value || '0');
        const nombre = document.getElementById('Nombre').value.trim();
        const primerApellido = document.getElementById('PrimerApellido').value.trim();
        const segundoApellido = document.getElementById('SegundoApellido').value.trim();
        const correo = document.getElementById('Correo').value.trim();
        const rolId = parseInt(document.getElementById('RolId').value || '1');
        const activo = document.getElementById('Activo').value === 'true';
        const contrasena = document.getElementById('Contrasena').value.trim();
        const confirmarContrasena = document.getElementById('ConfirmarContrasena').value.trim();

        const esNuevo = id === 0;

        // Validation
        if (!nombre || !primerApellido) {
            showNotification('warning', 'Campos requeridos', 'Por favor complete el nombre y primer apellido');
            return;
        }

        // Password validation for new users
        if (esNuevo && !contrasena) {
            showNotification('warning', 'Contraseña requerida', 'Debe ingresar una contraseña para el nuevo usuario');
            return;
        }

        // Password match validation
        if (contrasena && contrasena !== confirmarContrasena) {
            showNotification('warning', 'Contraseñas no coinciden', 'Las contraseñas ingresadas no coinciden');
            return;
        }

        // Confirmation
        const confirmResult = await Swal.fire({
            icon: 'question',
            title: 'Confirmar',
            text: esNuevo ? '¿Desea registrar este usuario?' : '¿Desea guardar los cambios del usuario?',
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmResult.isConfirmed) return;

        // Build payload
        const payload = {
            IdUsuario: id,
            Nombre: nombre,
            PrimerApellido: primerApellido,
            SegundoApellido: segundoApellido || null,
            Correo: correo || null,
            RolId: rolId,
            Activo: activo,
            Contrasena: contrasena || null
        };

        showLoading(true, esNuevo ? 'Registrando usuario...' : 'Actualizando usuario...');

        try {
            const url = esNuevo ? window.UsuariosUrls.crearUsuario : window.UsuariosUrls.actualizarUsuario;
            const token = getAntiForgeryToken();

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(payload)
            });

            const json = await response.json().catch(() => null);

            if (!response.ok || !json || json.ok === false) {
                showLoading(false);
                showNotification('error', 'Error', json?.message || 'No se pudo guardar el usuario');
                return;
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuario'));
            if (modal) modal.hide();

            showNotification(
                'success',
                esNuevo ? 'Usuario registrado' : 'Usuario actualizado',
                json.message || (esNuevo ? 'El usuario fue registrado correctamente.' : 'Los cambios fueron guardados correctamente.'),
                true
            );

            // Reload page to refresh data
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('Error saving usuario:', error);
            showNotification('error', 'Error', 'No se pudo guardar el usuario');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // DELETE OPERATION
    // ============================================

    function eliminarUsuario(id, nombre) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Estás seguro?',
            html: `Se eliminará el usuario: <strong>${escapeHtml(nombre)}</strong>`,
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: async function () {
                showLoading(true, 'Eliminando usuario...');

                try {
                    const response = await fetch(`${window.UsuariosUrls.eliminarUsuario}?id=${id}`, {
                        method: 'POST'
                    });

                    const json = await response.json().catch(() => null);

                    if (!response.ok || !json || json.ok === false) {
                        showLoading(false);
                        showNotification('error', 'Error', json?.message || 'No se pudo eliminar el usuario');
                        return;
                    }

                    showLoading(false);
                    showNotification('success', 'Eliminado', json.message || 'El usuario ha sido eliminado correctamente.', true);

                    // Reload page to refresh data
                    setTimeout(() => location.reload(), 1500);
                } catch (error) {
                    showLoading(false);
                    console.error('Error deleting usuario:', error);
                    showNotification('error', 'Error', 'No se pudo eliminar el usuario');
                }
            }
        });
    }

    window.eliminarUsuario = eliminarUsuario;

    // ============================================
    // STATUS TOGGLE
    // ============================================

    async function cambiarEstadoUsuario(id, isChecked) {
        // Find the usuario data
        const usuario = mobileState.allUsuarios.find(u => u.idUsuario === id);
        if (!usuario) {
            showNotification('error', 'Error', 'Usuario no encontrado');
            return;
        }

        // Build payload for update
        const payload = {
            IdUsuario: id,
            Nombre: usuario.nombre,
            PrimerApellido: usuario.primerApellido,
            SegundoApellido: usuario.segundoApellido || null,
            Correo: usuario.correo || null,
            RolId: usuario.rolId,
            Activo: isChecked,
            Contrasena: null
        };

        try {
            const token = getAntiForgeryToken();

            const response = await fetch(window.UsuariosUrls.actualizarUsuario, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': token
                },
                body: JSON.stringify(payload)
            });

            const json = await response.json().catch(() => null);

            if (!response.ok || !json || json.ok === false) {
                // Revert checkboxes
                revertCheckboxState(id, !isChecked);
                showNotification('error', 'Error', json?.message || 'No se pudo actualizar el estado');
                return;
            }

            showNotification(
                'success',
                'Estado actualizado',
                `El usuario fue ${isChecked ? 'activado' : 'desactivado'} correctamente.`,
                true
            );

            // Update local state
            usuario.activo = isChecked;

            // Update UI for mobile view
            if (isMobileView()) {
                const card = document.querySelector(`.tm-usuario-card[data-id="${id}"]`);
                if (card) {
                    GestionCommon.updateCardStatusBadge(card, isChecked, STATUS_LABELS);

                    const label = card.querySelector(`label[for="mobile-estado-${id}"]`);
                    if (label) {
                        label.textContent = isChecked ? 'Activo' : 'Inactivo';
                    }
                }
            }

            // Update stats
            updateStats(mobileState.allUsuarios);
        } catch (error) {
            console.error('Error updating estado:', error);
            revertCheckboxState(id, !isChecked);
            showNotification('error', 'Error', 'No se pudo actualizar el estado');
        }
    }

    function revertCheckboxState(id, checked) {
        const desktopCheckbox = document.getElementById(`estado-${id}`);
        const mobileCheckbox = document.getElementById(`mobile-estado-${id}`);

        if (desktopCheckbox) desktopCheckbox.checked = checked;
        if (mobileCheckbox) mobileCheckbox.checked = checked;
    }

    window.cambiarEstadoUsuario = cambiarEstadoUsuario;

    // ============================================
    // MOBILE EVENT HANDLERS
    // ============================================

    function attachMobileEventHandlers() {
        // Search input with debounce
        if (DOM.mobileSearch) {
            let searchTimeout;
            DOM.mobileSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    mobileState.searchTerm = e.target.value;
                    filterUsuarios();
                    renderMobileUsuarioCards();
                }, 300);
            });
        }

        // Status filter
        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterUsuarios();
                renderMobileUsuarioCards();
            });
        }

        // Role filter
        if (DOM.mobileFilterRol) {
            DOM.mobileFilterRol.addEventListener('change', (e) => {
                mobileState.filterRol = e.target.value;
                filterUsuarios();
                renderMobileUsuarioCards();
            });
        }

        // Page size
        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileUsuarioCards();
            });
        }
    }

    // ============================================
    // MODAL EVENT HANDLERS
    // ============================================

    function onModalShown() {
        document.getElementById('Nombre').focus();
    }

    function onModalHidden() {
        nuevoUsuario();
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        if (isPageLoaded) {
            if (isMobileView()) {
                renderMobileUsuarioCards();
            }
        }
    }, 250);

    // ============================================
    // DOCUMENT READY
    // ============================================

    $(function () {
        initPage();
    });

})();