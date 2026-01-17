(function () {
    'use strict';

    // ============================================
    // CONFIGURATION & STATE
    // ============================================

    const CONFIG = {
        tableId: 'tablaEncargados',
        modalId: 'modalEncargado',
        formId: 'encargadoForm',
        cardsContainerId: 'encargadoCardsContainer',
        paginationId: 'mobilePaginationEncargados',
        loadingOverlayId: 'loading-overlay',
        nonSortableColumns: [7, 8] // Credenciales y Acciones
    };

    // Mobile pagination state - matches Maestras structure
    const mobileState = {
        allEncargados: [],
        filteredEncargados: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        filterEstado: ''
    };

    // DOM Elements (cached on init)
    const DOM = {
        modal: null,
        form: null,
        loadingOverlay: null,
        encargadoCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobilePageSize: null,
        mobilePagination: null
    };

    // DataTable instance
    let dataTable = null;

    // Track current view
    let isPageLoaded = false;

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

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

    function init() {
        // Cache DOM elements
        DOM.modal = document.getElementById(CONFIG.modalId);
        DOM.form = document.getElementById(CONFIG.formId);
        DOM.loadingOverlay = document.getElementById(CONFIG.loadingOverlayId);
        DOM.encargadoCardsContainer = document.getElementById(CONFIG.cardsContainerId);
        DOM.mobileSearch = document.getElementById('mobileSearchEncargados');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstado');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById(CONFIG.paginationId);

        loadEncargadosData();
        initDataTable();
        initMobileEventHandlers();
        initFormHandlers();
        initModalHandlers();
        initResizeHandler();

        // Initial render based on view
        if (isMobileView()) {
            renderMobileEncargadoCards();
        }

        isPageLoaded = true;

        // Hide loading overlay
        showLoading(false);
    }

    // ============================================
    // DATA LOADING
    // ============================================

    function loadEncargadosData() {
        const dataElement = document.getElementById('encargadosData');
        if (dataElement) {
            try {
                mobileState.allEncargados = JSON.parse(dataElement.textContent);
                mobileState.filteredEncargados = [...mobileState.allEncargados];
            } catch (e) {
                console.error('Error parsing encargados data:', e);
                mobileState.allEncargados = [];
                mobileState.filteredEncargados = [];
            }
        }
    }

    // ============================================
    // DATATABLE INITIALIZATION
    // ============================================

    function initDataTable() {
        if (typeof $.fn.DataTable === 'undefined') return;

        dataTable = $('#' + CONFIG.tableId).DataTable({
            order: [[0, 'asc']],
            pageLength: 10,
            responsive: false,
            autoWidth: false,
            columnDefs: [
                { orderable: false, targets: CONFIG.nonSortableColumns }
            ],
            language: {
                lengthMenu: "Mostrar _MENU_ registros",
                search: "Buscar:",
                zeroRecords: "No se encontraron registros",
                info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
                infoEmpty: "Mostrando 0 a 0 de 0 registros",
                infoFiltered: "(filtrado de _MAX_ registros totales)",
                paginate: {
                    first: "Primero",
                    last: "Último",
                    next: "Siguiente",
                    previous: "Anterior"
                }
            }
        });
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterEncargados() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;

        mobileState.filteredEncargados = mobileState.allEncargados.filter(encargado => {
            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const nombre = (encargado.nombreCompleto || '').toLowerCase();
                const estudiantes = (encargado.estudiantes || '').toLowerCase();
                const telefono = (encargado.telefono || '').toLowerCase();
                const direccion = (encargado.direccion || '').toLowerCase();

                matchesSearch = nombre.includes(searchTerm) ||
                    estudiantes.includes(searchTerm) ||
                    telefono.includes(searchTerm) ||
                    direccion.includes(searchTerm);
            }

            // Status filter
            let matchesStatus = true;
            if (filterEstado === 'activo') {
                matchesStatus = encargado.activo === true;
            } else if (filterEstado === 'inactivo') {
                matchesStatus = encargado.activo === false;
            }

            return matchesSearch && matchesStatus;
        });

        mobileState.currentPage = 1;
    }

    function getPagedEncargados() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredEncargados.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredEncargados.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileEncargadoCards();

        if (DOM.encargadoCardsContainer) {
            DOM.encargadoCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Global function for pagination buttons
    window.goToPageEncargados = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createEncargadoCardHtml(encargado) {
        const statusClass = encargado.activo ? 'active' : 'inactive';
        const statusBadge = GestionCommon.createStatusBadgeHtml(encargado.activo);

        // Truncate estudiantes if too long
        const estudiantesText = encargado.estudiantes || '-';
        const truncatedEstudiantes = estudiantesText.length > 40
            ? estudiantesText.substring(0, 40) + '...'
            : estudiantesText;

        return `
            <div class="tm-encargado-card ${statusClass}" data-id="${encargado.idUsuario}">
                <div class="tm-encargado-card-header" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#encargado-details-${encargado.idUsuario}" 
                     aria-expanded="false"
                     aria-controls="encargado-details-${encargado.idUsuario}">
                    <div class="tm-encargado-info">
                        <div class="tm-encargado-title-row">
                            <span class="tm-encargado-name">${escapeHtml(encargado.nombreCompleto)}</span>
                            ${statusBadge}
                        </div>
                        <div class="tm-encargado-meta">
                            <span class="tm-encargado-meta-item">
                                <i class="bi bi-mortarboard"></i>
                                ${escapeHtml(truncatedEstudiantes)}
                            </span>
                        </div>
                    </div>
                    <div class="tm-encargado-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="encargado-details-${encargado.idUsuario}">
                    <div class="tm-encargado-card-body">
                        <div class="tm-encargado-details">
                            <div class="tm-encargado-detail-item">
                                <span class="tm-encargado-detail-label">Estado Contrato</span>
                                <span class="tm-encargado-detail-value">${escapeHtml(encargado.estadoContrato || '—')}</span>
                            </div>
                            <div class="tm-encargado-detail-item">
                                <span class="tm-encargado-detail-label">Fecha Inicio</span>
                                <span class="tm-encargado-detail-value">${escapeHtml(encargado.fechaInicio || '—')}</span>
                            </div>
                            <div class="tm-encargado-detail-item">
                                <span class="tm-encargado-detail-label">Teléfono</span>
                                <span class="tm-encargado-detail-value">${escapeHtml(encargado.telefono || '—')}</span>
                            </div>
                            <div class="tm-encargado-detail-item full-width">
                                <span class="tm-encargado-detail-label">Dirección</span>
                                <span class="tm-encargado-detail-value">${escapeHtml(encargado.direccion || '—')}</span>
                            </div>
                            <div class="tm-encargado-detail-item full-width">
                                <span class="tm-encargado-detail-label">Estudiantes</span>
                                <span class="tm-encargado-detail-value">${escapeHtml(encargado.estudiantes || '—')}</span>
                            </div>
                        </div>
                        <div class="tm-encargado-actions">
                            <button class="tm-btn tm-btn-sm tm-btn-credential" 
                                    onclick="enviarContrasena(${encargado.idUsuario})"
                                    title="Enviar credenciales">
                                <i class="bi bi-envelope me-1"></i>
                                Credenciales
                            </button>
                            <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                    onclick="editarEncargado(${encargado.idUsuario})"
                                    title="Editar">
                                <i class="bi bi-pencil me-1"></i>
                                Editar
                            </button>
                            <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                    onclick="eliminarEncargado(${encargado.idUsuario})"
                                    title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createEmptyStateHtml() {
        const isFiltered = mobileState.searchTerm || mobileState.filterEstado;

        if (isFiltered) {
            return `
                <div class="tm-empty-state">
                    <i class="bi bi-search"></i>
                    <p>No se encontraron padres</p>
                    <small>Intente con otros términos de búsqueda</small>
                </div>
            `;
        }

        return `
            <div class="tm-empty-state">
                <i class="bi bi-people"></i>
                <p>No hay padres registrados</p>
                <small>Haga clic en "Nuevo Padre" para agregar uno</small>
            </div>
        `;
    }

    function createPaginationHtml() {
        const totalEncargados = mobileState.filteredEncargados.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalEncargados === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalEncargados);

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
                        onclick="goToPageEncargados(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalEncargados}</strong> padres
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageEncargados(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageEncargados(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileEncargadoCards() {
        if (!DOM.encargadoCardsContainer) return;

        const pagedEncargados = getPagedEncargados();

        if (pagedEncargados.length === 0) {
            DOM.encargadoCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.encargadoCardsContainer.innerHTML = pagedEncargados
                .map(encargado => createEncargadoCardHtml(encargado))
                .join('');
        }

        // Render pagination
        if (DOM.mobilePagination) {
            if (mobileState.filteredEncargados.length > 0) {
                DOM.mobilePagination.innerHTML = createPaginationHtml();
                DOM.mobilePagination.style.display = '';
            } else {
                DOM.mobilePagination.innerHTML = '';
                DOM.mobilePagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // MOBILE EVENT HANDLERS
    // ============================================

    function initMobileEventHandlers() {
        // Search input with debounce
        if (DOM.mobileSearch) {
            let searchTimeout;
            DOM.mobileSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    mobileState.searchTerm = e.target.value;
                    filterEncargados();
                    renderMobileEncargadoCards();
                }, 300);
            });
        }

        // Status filter
        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterEncargados();
                renderMobileEncargadoCards();
            });
        }

        // Page size
        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileEncargadoCards();
            });
        }
    }

    // ============================================
    // FORM HANDLERS
    // ============================================

    function initFormHandlers() {
        if (!DOM.form) return;

        DOM.form.addEventListener('submit', handleFormSubmit);

        // Sync switch with hidden field
        const activoSwitch = document.getElementById('ActivoSwitch');
        const activoHidden = document.getElementById('Activo');
        if (activoSwitch && activoHidden) {
            activoSwitch.addEventListener('change', function () {
                activoHidden.value = this.checked.toString();
            });
        }
    }

    function initModalHandlers() {
        if (!DOM.modal) return;

        DOM.modal.addEventListener('shown.bs.modal', function () {
            document.getElementById('Nombre')?.focus();
        });

        DOM.modal.addEventListener('hidden.bs.modal', function () {
            nuevoEncargado();
        });
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const id = parseInt(document.getElementById('IdUsuario').value || '0');
        const esEdicion = id > 0;

        const titulo = esEdicion ? 'Confirmar cambios' : 'Confirmar registro';
        const texto = esEdicion
            ? '¿Desea guardar los cambios del padre?'
            : '¿Desea registrar este nuevo padre?';

        Swal.fire({
            icon: 'question',
            title: titulo,
            text: texto,
            showCancelButton: true,
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#1e3a5f',
            cancelButtonColor: '#64748b'
        }).then(result => {
            if (result.isConfirmed) {
                submitForm(esEdicion);
            }
        });
    }

    function submitForm(esEdicion) {
        const urls = window.EncargadosConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        const url = esEdicion ? urls.actualizar : urls.registrar;
        const firma = document.getElementById('FirmaContrato').value;

        const payload = {
            IdUsuario: parseInt(document.getElementById('IdUsuario').value || '0'),
            Nombre: document.getElementById('Nombre').value,
            PrimerApellido: document.getElementById('PrimerApellido').value,
            SegundoApellido: document.getElementById('SegundoApellido').value,
            Correo: document.getElementById('Correo').value,
            Telefono: document.getElementById('Telefono').value,
            DireccionResidencia: document.getElementById('DireccionResidencia').value,
            Activo: document.getElementById('Activo').value === 'true',
            AceptoTerminos: document.getElementById('AceptoTerminos').value === 'true',
            FirmaContrato: (firma && firma.trim() !== '') ? firma : null
        };

        const token = GestionCommon.getAntiForgeryToken();

        showLoading(true, esEdicion ? 'Actualizando...' : 'Registrando...');

        $.ajax({
            url: url,
            type: 'POST',
            data: payload,
            headers: { 'RequestVerificationToken': token }
        }).done(function (r) {
            showLoading(false);

            if (r && r.ok === false) {
                showNotification('error', 'Error', r.message || 'No se pudo guardar.');
                return;
            }

            Swal.fire({
                icon: 'success',
                title: esEdicion ? 'Actualizado' : 'Registrado',
                text: esEdicion
                    ? 'Los cambios se guardaron correctamente.'
                    : 'El padre fue registrado correctamente.',
                confirmButtonColor: '#1e3a5f'
            }).then(() => {
                $('#' + CONFIG.modalId).modal('hide');
                location.reload();
            });

        }).fail(function (xhr) {
            showLoading(false);

            let msg = 'Error de datos. Revise los campos requeridos.';
            if (xhr.responseJSON?.message) {
                msg = xhr.responseJSON.message;
            }
            if (xhr.responseJSON?.errors) {
                const e = xhr.responseJSON.errors;
                const detalle = Object.keys(e).map(k => `${k}: ${e[k].join(', ')}`).join('\n');
                msg = `${msg}\n\n${detalle}`;
            }

            showNotification('error', 'Error', msg);
        });
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    function nuevoEncargado() {
        if (DOM.form) {
            DOM.form.reset();
            DOM.form.classList.remove('was-validated');
        }

        document.getElementById('IdUsuario').value = '0';
        document.getElementById('AceptoTerminos').value = 'false';
        document.getElementById('Activo').value = 'true';
        document.getElementById('FirmaContrato').value = '';

        // Update switch
        const activoSwitch = document.getElementById('ActivoSwitch');
        if (activoSwitch) activoSwitch.checked = true;

        // Hide activo container for new records
        const activoContainer = document.getElementById('activoContainer');
        if (activoContainer) activoContainer.style.display = 'none';

        // Update modal title
        const modalLabel = document.getElementById('modalEncargadoLabel');
        if (modalLabel) {
            modalLabel.innerHTML = '<i class="bi bi-person-plus me-2"></i>Registrar Padre';
        }
    }

    window.nuevoEncargado = nuevoEncargado;

    window.editarEncargado = function (id) {
        const urls = window.EncargadosConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        showLoading(true, 'Cargando datos...');

        $.get(urls.obtenerParaEditar, { id: id })
            .done(function (r) {
                showLoading(false);

                if (!r || r.ok !== true) {
                    showNotification('error', 'Error', (r && r.message) ? r.message : 'No se pudo cargar el padre.');
                    return;
                }

                const e = r.data;
                document.getElementById('IdUsuario').value = e.idUsuario;
                document.getElementById('Nombre').value = e.nombre || '';
                document.getElementById('PrimerApellido').value = e.primerApellido || '';
                document.getElementById('SegundoApellido').value = e.segundoApellido || '';
                document.getElementById('Correo').value = e.correo || '';
                document.getElementById('Telefono').value = e.telefono || '';
                document.getElementById('DireccionResidencia').value = e.direccionResidencia || '';

                document.getElementById('AceptoTerminos').value = (e.aceptoTerminos === true).toString();
                document.getElementById('Activo').value = (e.activo === true).toString();

                // Update switch
                const activoSwitch = document.getElementById('ActivoSwitch');
                if (activoSwitch) activoSwitch.checked = e.activo === true;

                // Show activo container for editing
                const activoContainer = document.getElementById('activoContainer');
                if (activoContainer) activoContainer.style.display = 'block';

                // Handle date
                if (e.firmaContrato) {
                    let iso = '';
                    if (typeof e.firmaContrato === 'string') {
                        if (e.firmaContrato.includes('T')) {
                            iso = e.firmaContrato.split('T')[0];
                        } else if (e.firmaContrato.includes('/')) {
                            const p = e.firmaContrato.split('/');
                            if (p.length === 3) {
                                iso = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                            }
                        } else {
                            iso = e.firmaContrato;
                        }
                    }
                    document.getElementById('FirmaContrato').value = iso;
                } else {
                    document.getElementById('FirmaContrato').value = '';
                }

                // Update modal title
                const modalLabel = document.getElementById('modalEncargadoLabel');
                if (modalLabel) {
                    modalLabel.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Padre';
                }

                // Clear validation
                if (DOM.form) DOM.form.classList.remove('was-validated');

                // Show modal
                $('#' + CONFIG.modalId).modal('show');
            })
            .fail(function () {
                showLoading(false);
                showNotification('error', 'Error', 'No se pudo cargar la información para editar.');
            });
    };

    window.eliminarEncargado = function (id) {
        const urls = window.EncargadosConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        GestionCommon.showDeleteConfirmation({
            title: '¿Eliminar padre?',
            html: 'Esta acción eliminará el registro del padre.<br><strong>Esta acción no se puede deshacer.</strong>',
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: function () {
                showLoading(true, 'Eliminando...');

                $.post(urls.eliminar, { id: id })
                    .done(function (resp) {
                        showLoading(false);

                        if (resp && resp.ok === false) {
                            showNotification('error', 'Error', resp.message || 'No se pudo eliminar.');
                            return;
                        }

                        showNotification('success', 'Eliminado', 'El padre fue eliminado correctamente.', true);
                        setTimeout(() => location.reload(), 1500);
                    })
                    .fail(function () {
                        showLoading(false);
                        showNotification('error', 'Error', 'No se pudo eliminar el padre.');
                    });
            }
        });
    };

    window.enviarContrasena = function (id) {
        const urls = window.EncargadosConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        Swal.fire({
            icon: 'question',
            title: 'Enviar contraseña temporal',
            text: '¿Desea resetear la contraseña y enviar una contraseña temporal por correo?',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-envelope me-1"></i>Sí, enviar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#64748b'
        }).then(r => {
            if (!r.isConfirmed) return;

            showLoading(true, 'Enviando correo...');

            $.post(urls.resetCredenciales, { idUsuario: id })
                .done(function (resp) {
                    showLoading(false);

                    if (resp && resp.ok === false) {
                        showNotification('error', 'Error', resp.message || 'No se pudo enviar.');
                        return;
                    }

                    showNotification('success', 'Enviado', (resp && resp.message) ? resp.message : 'Correo enviado correctamente.');
                })
                .fail(function (xhr) {
                    showLoading(false);
                    const msg = (xhr.responseJSON && xhr.responseJSON.message)
                        ? xhr.responseJSON.message
                        : 'No se pudo enviar el correo.';
                    showNotification('error', 'Error', msg);
                });
        });
    };

    // ============================================
    // RESIZE HANDLER
    // ============================================

    function initResizeHandler() {
        const handler = GestionCommon.createResizeHandler(() => {
            if (isPageLoaded) {
                if (isMobileView()) {
                    renderMobileEncargadoCards();
                } else {
                    if (dataTable) {
                        dataTable.columns.adjust().draw();
                    }
                }
            }
        }, 250);

        window.addEventListener('resize', handler);
    }

})();