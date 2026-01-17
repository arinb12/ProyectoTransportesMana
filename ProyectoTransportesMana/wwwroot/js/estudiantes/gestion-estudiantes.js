(function () {
    'use strict';

    // ============================================
    // MODULE STATE
    // ============================================
    let dataTableInstance = null;
    let telefonoMask = null;
    let isPageLoaded = false;

    // Mobile pagination state
    const mobileState = {
        allStudents: [],
        filteredStudents: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        filterEstado: ''
    };

    // DOM Elements (cached on init)
    const DOM = {
        modal: null,
        form: null,
        encargado: null,
        maestra: null,
        institucion: null,
        telefono: null,
        busetas: null,
        loadingOverlay: null,
        // Mobile elements
        studentCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobilePageSize: null,
        mobilePagination: null
    };

    // Status labels for estudiantes (masculine form)
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

    function getAntiForgeryToken() {
        return GestionCommon.getAntiForgeryToken();
    }

    // ============================================
    // SELECT2 INITIALIZATION
    // ============================================

    function initSelect2($el) {
        if (!$el || !$el.length || !$.fn.select2) return;

        $el.select2({
            placeholder: $el.data('placeholder') || 'Seleccione una opción',
            allowClear: true,
            width: '100%',
            dropdownParent: DOM.modal,
            language: {
                noResults: () => 'No se encontraron resultados',
                searching: () => 'Buscando...'
            }
        }).on('change.select2', function () {
            $(this).trigger('input');
            const $form = $(this).closest('form');
            if ($form.length && $form.data('validator')) {
                $(this).valid();
            }
        });
    }

    function initSelect2Multiple($el) {
        if (!$el || !$el.length || !$.fn.select2) return;

        $el.select2({
            placeholder: $el.data('placeholder') || 'Seleccione una o más opciones',
            allowClear: true,
            width: '100%',
            dropdownParent: DOM.modal,
            closeOnSelect: false,
            language: {
                noResults: () => 'No se encontraron resultados',
                searching: () => 'Buscando...'
            }
        });
    }

    // ============================================
    // PHONE MASK
    // ============================================

    function initTelefonoMask() {
        if (!DOM.telefono || typeof IMask === 'undefined') return;

        if (telefonoMask) {
            telefonoMask.destroy();
            telefonoMask = null;
        }

        telefonoMask = IMask(DOM.telefono, {
            mask: [
                { mask: '0000-0000' },
                { mask: '+{506} 0000-0000' }
            ],
            lazy: false
        });

        $(DOM.telefono).on('input blur', function () {
            $(this).trigger('change');
            const $form = $(this).closest('form');
            if ($form.length && $form.data('validator')) {
                $form.valid();
            }
        });
    }

    function destroyTelefonoMask() {
        if (telefonoMask) {
            telefonoMask.destroy();
            telefonoMask = null;
        }
    }

    // ============================================
    // BUSETAS LOADING
    // ============================================

    async function cargarBusetas(showLoadingOverlay = false) {
        if (showLoadingOverlay) {
            showLoading(true, 'Cargando busetas...');
        }

        try {
            const response = await fetch('/Estudiantes/ObtenerBusetas');
            if (!response.ok) throw new Error('Error al cargar busetas');

            const data = await response.json();
            const $busetas = $(DOM.busetas);

            $busetas.empty();
            data.forEach(b => {
                const option = new Option(b.texto, b.id, false, false);
                $busetas.append(option);
            });

            return data;
        } catch (error) {
            console.error('Error loading busetas:', error);
            return [];
        } finally {
            if (showLoadingOverlay) {
                showLoading(false);
            }
        }
    }

    window.cargarBusetas = cargarBusetas;

    // ============================================
    // MOBILE: DATA LOADING
    // ============================================

    function loadStudentsData() {
        const dataScript = document.getElementById('estudiantesData');
        if (!dataScript) return [];

        try {
            return JSON.parse(dataScript.textContent) || [];
        } catch (error) {
            console.error('Error parsing students data:', error);
            return [];
        }
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterStudents() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;

        mobileState.filteredStudents = mobileState.allStudents.filter(student => {
            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const nombre = (student.nombreCompleto || '').toLowerCase();
                const encargado = (student.encargado || '').toLowerCase();
                const institucion = (student.institucion || '').toLowerCase();
                const seccion = (student.seccion || '').toLowerCase();
                const telefono = (student.telefono || '').toLowerCase();

                matchesSearch = nombre.includes(searchTerm) ||
                    encargado.includes(searchTerm) ||
                    institucion.includes(searchTerm) ||
                    seccion.includes(searchTerm) ||
                    telefono.includes(searchTerm);
            }

            // Status filter
            let matchesStatus = true;
            if (filterEstado === 'activo') {
                matchesStatus = student.activo === true;
            } else if (filterEstado === 'inactivo') {
                matchesStatus = student.activo === false;
            }

            return matchesSearch && matchesStatus;
        });

        // Reset to first page when filtering
        mobileState.currentPage = 1;
    }

    function getPagedStudents() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredStudents.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredStudents.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileStudentCards();

        // Scroll to top of cards container
        if (DOM.studentCardsContainer) {
            DOM.studentCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Expose goToPage globally for onclick handlers
    window.goToPage = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createStudentCardHtml(student) {
        const statusClass = student.activo ? 'active' : 'inactive';
        const statusBadge = GestionCommon.createStatusBadgeHtml(student.activo, STATUS_LABELS);

        return `
            <div class="tm-student-card ${statusClass}" data-id="${student.id}">
                <div class="tm-student-card-header" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#student-details-${student.id}" 
                     aria-expanded="false"
                     aria-controls="student-details-${student.id}">
                    <div class="tm-student-info">
                        <div class="tm-student-title-row">
                            <span class="tm-student-name">${escapeHtml(student.nombreCompleto)}</span>
                            ${statusBadge}
                        </div>
                        <div class="tm-student-meta">
                            <span class="tm-student-meta-item">
                                <i class="bi bi-building"></i>
                                ${escapeHtml(student.institucion || 'Sin institución')}
                            </span>
                            <span class="tm-student-meta-item">
                                <i class="bi bi-bookmark"></i>
                                ${escapeHtml(student.seccion || 'Sin sección')}
                            </span>
                        </div>
                    </div>
                    <div class="tm-student-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="student-details-${student.id}">
                    <div class="tm-student-card-body">
                        <div class="tm-student-details">
                            <div class="tm-student-detail-item">
                                <span class="tm-student-detail-label">Encargado Legal</span>
                                <span class="tm-student-detail-value">${escapeHtml(student.encargado || '—')}</span>
                            </div>
                            <div class="tm-student-detail-item">
                                <span class="tm-student-detail-label">Maestra</span>
                                <span class="tm-student-detail-value">${escapeHtml(student.maestra || '—')}</span>
                            </div>
                            <div class="tm-student-detail-item">
                                <span class="tm-student-detail-label">Institución</span>
                                <span class="tm-student-detail-value">${escapeHtml(student.institucion || '—')}</span>
                            </div>
                            <div class="tm-student-detail-item">
                                <span class="tm-student-detail-label">Teléfono</span>
                                <span class="tm-student-detail-value">${escapeHtml(student.telefono || '—')}</span>
                            </div>
                        </div>
                        <div class="tm-student-actions">
                            <div class="tm-student-actions-left">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           role="switch"
                                           id="mobile-estado-${student.id}"
                                           ${student.activo ? 'checked' : ''}
                                           onchange="cambiarEstadoEstudiante(${student.id}, this.checked)">
                                    <label class="form-check-label small" for="mobile-estado-${student.id}">
                                        ${student.activo ? 'Activo' : 'Inactivo'}
                                    </label>
                                </div>
                            </div>
                            <div class="tm-student-actions-right">
                                <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                        onclick="editarEstudiante(${student.id})"
                                        title="Editar">
                                    <i class="bi bi-pencil me-1"></i>
                                    Editar
                                </button>
                                <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                        onclick="eliminarEstudiante(${student.id})"
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
        // Create a compatible state object for GestionCommon
        const state = {
            searchTerm: mobileState.searchTerm,
            filterEstado: mobileState.filterEstado
        };

        return GestionCommon.createEmptyStateHtml(state, {
            iconFiltered: 'bi-search',
            iconEmpty: 'bi-people',
            messageFiltered: 'No se encontraron estudiantes',
            messageEmpty: 'No hay estudiantes registrados',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Haga clic en "Nuevo Estudiante" para agregar uno'
        });
    }

    function createPaginationHtml() {
        const totalStudents = mobileState.filteredStudents.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalStudents === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalStudents);

        // Generate page numbers
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
                        onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalStudents}</strong> estudiantes
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPage(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPage(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileStudentCards() {
        if (!DOM.studentCardsContainer) return;

        const pagedStudents = getPagedStudents();

        // Render cards or empty state
        if (pagedStudents.length === 0) {
            DOM.studentCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.studentCardsContainer.innerHTML = pagedStudents
                .map(student => createStudentCardHtml(student))
                .join('');
        }

        // Render pagination
        if (DOM.mobilePagination) {
            if (mobileState.filteredStudents.length > 0) {
                DOM.mobilePagination.innerHTML = createPaginationHtml();
                DOM.mobilePagination.style.display = '';
            } else {
                DOM.mobilePagination.innerHTML = '';
                DOM.mobilePagination.style.display = 'none';
            }
        }
    }

    function initMobileView() {
        // Load data
        mobileState.allStudents = loadStudentsData();
        mobileState.filteredStudents = [...mobileState.allStudents];

        // Initial render
        renderMobileStudentCards();
    }

    function attachMobileEventHandlers() {
        // Search input with debounce
        if (DOM.mobileSearch) {
            let searchTimeout;
            DOM.mobileSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    mobileState.searchTerm = e.target.value;
                    filterStudents();
                    renderMobileStudentCards();
                }, 300);
            });
        }

        // Status filter
        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterStudents();
                renderMobileStudentCards();
            });
        }

        // Page size
        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileStudentCards();
            });
        }
    }

    // ============================================
    // FORM HANDLING
    // ============================================

    function nuevoEstudiante() {
        if (DOM.form) {
            DOM.form.reset();
        }

        $('#modalEstudianteLabel').html('<i class="bi bi-mortarboard me-2"></i>Registrar Estudiante');
        $('#estudianteForm').attr('action', '/Estudiantes/RegistrarEstudiante');
        $('#IdUsuario').val('');

        [DOM.encargado, DOM.maestra, DOM.institucion].forEach(el => {
            if (el) {
                $(el).val('').trigger('change');
                $(el).removeClass('is-invalid');
            }
        });

        if (DOM.busetas) {
            $(DOM.busetas).val(null).trigger('change');
        }

        $('#ActivoCheck').prop('checked', true);
        $('#estudianteForm').find('.is-invalid').removeClass('is-invalid');
        $('#estudianteForm').find('.is-valid').removeClass('is-valid');
    }

    window.nuevoEstudiante = nuevoEstudiante;

    async function editarEstudiante(id) {
        showLoading(true, 'Cargando datos del estudiante...');

        try {
            const response = await fetch(`/Estudiantes/ObtenerParaEditar?id=${id}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (!result?.ok || !result.data) {
                showNotification('error', 'Error', result?.message || 'No se pudieron cargar los datos del estudiante.');
                return;
            }

            const data = result.data;

            $('#modalEstudianteLabel').html('<i class="bi bi-pencil me-2"></i>Editar Estudiante');
            $('#estudianteForm').attr('action', '/Estudiantes/ActualizarEstudiante');

            $('#IdUsuario').val(data.id);
            $('#Nombre').val(data.nombre);
            $('#PrimerApellido').val(data.primerApellido);
            $('#SegundoApellido').val(data.segundoApellido || '');
            $('#Seccion').val(data.seccion);
            $('#Telefono').val(data.telefono);
            $('#ActivoCheck').prop('checked', data.activo);

            $('#IdEncargado').val(data.idEncargado).trigger('change');
            $('#IdInstitucion').val(data.idInstitucion).trigger('change');
            $('#IdMaestra').val(data.idMaestra).trigger('change');

            const busetasResponse = await fetch(`/Estudiantes/ObtenerBusetasPorEstudiante?id=${id}`);
            if (busetasResponse.ok) {
                const busetasAsignadas = await busetasResponse.json();
                $('#Busetas').val(busetasAsignadas.map(String)).trigger('change');
            }

            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEstudiante'));
            modal.show();

        } catch (error) {
            console.error('Error loading student:', error);
            showNotification('error', 'Error', 'Error al cargar los datos del estudiante.');
        } finally {
            showLoading(false);
        }
    }

    window.editarEstudiante = editarEstudiante;

    async function handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const action = form.action;
        const isCreate = action.includes('RegistrarEstudiante');

        const formData = new FormData(form);

        const busetasSeleccionadas = $('#Busetas').val() || [];
        formData.delete('Busetas');
        busetasSeleccionadas.forEach(b => formData.append('Busetas', b));

        showLoading(true, isCreate ? 'Registrando estudiante...' : 'Actualizando estudiante...');

        try {
            const response = await fetch(action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            const data = await response.json().catch(() => null);

            if (response.ok && data?.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalEstudiante'));
                if (modal) modal.hide();

                showNotification(
                    'success',
                    data.title || (isCreate ? 'Estudiante creado' : 'Estudiante actualizado'),
                    data.message || 'Los datos fueron guardados correctamente.',
                    true
                );

                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(
                    'error',
                    data?.title || 'Error',
                    data?.message || 'No se pudo guardar el estudiante.'
                );
            }
        } catch (error) {
            console.error('Error saving student:', error);
            showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // DELETE OPERATIONS
    // ============================================

    function eliminarEstudiante(id) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Eliminar estudiante?',
            html: 'Esta acción marcará al estudiante como eliminado y no podrá usar el sistema.',
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: function () {
                performDelete(id);
            }
        });
    }

    async function performDelete(id) {
        showLoading(true, 'Eliminando estudiante...');

        try {
            const response = await fetch(`/Estudiantes/EliminarEstudiante/${id}`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                }
            });

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const data = await response.json().catch(() => null);

            if (response.ok && data?.ok) {
                showNotification(
                    'success',
                    data.title || 'Estudiante eliminado',
                    data.message || 'El estudiante fue eliminado correctamente.',
                    true
                );
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showNotification(
                    'error',
                    data?.title || 'Error al eliminar',
                    data?.message || 'No se pudo eliminar el estudiante.'
                );
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            showNotification('error', 'Error', 'Ocurrió un error inesperado.');
        } finally {
            showLoading(false);
        }
    }

    window.eliminarEstudiante = eliminarEstudiante;

    // ============================================
    // STATUS TOGGLE
    // ============================================

    async function cambiarEstadoEstudiante(id, isChecked) {
        try {
            const response = await fetch(`/Estudiantes/CambiarEstado?id=${id}&activo=${isChecked}`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': getAntiForgeryToken()
                }
            });

            const data = await response.json().catch(() => null);

            if (data?.ok) {
                showNotification(
                    'success',
                    data.title || 'Estado actualizado',
                    data.message || `El estudiante fue ${isChecked ? 'activado' : 'desactivado'} correctamente.`,
                    true
                );

                // Update mobile state if in mobile view
                if (isMobileView()) {
                    const studentIndex = mobileState.allStudents.findIndex(s => s.id === id);
                    if (studentIndex !== -1) {
                        mobileState.allStudents[studentIndex].activo = isChecked;

                        // Update the card's appearance using GestionCommon
                        const card = document.querySelector(`.tm-student-card[data-id="${id}"]`);
                        if (card) {
                            GestionCommon.updateCardStatusBadge(card, isChecked, STATUS_LABELS);

                            // Update label
                            const label = card.querySelector(`label[for="mobile-estado-${id}"]`);
                            if (label) {
                                label.textContent = isChecked ? 'Activo' : 'Inactivo';
                            }
                        }
                    }
                }
            } else {
                // Revert the checkbox
                const desktopCheckbox = document.getElementById(`estado-${id}`);
                const mobileCheckbox = document.getElementById(`mobile-estado-${id}`);

                if (desktopCheckbox) desktopCheckbox.checked = !isChecked;
                if (mobileCheckbox) mobileCheckbox.checked = !isChecked;

                showNotification(
                    'error',
                    data?.title || 'Error',
                    data?.message || 'No se pudo actualizar el estado.'
                );
            }
        } catch (error) {
            console.error('Error changing status:', error);

            // Revert checkboxes
            const desktopCheckbox = document.getElementById(`estado-${id}`);
            const mobileCheckbox = document.getElementById(`mobile-estado-${id}`);

            if (desktopCheckbox) desktopCheckbox.checked = !isChecked;
            if (mobileCheckbox) mobileCheckbox.checked = !isChecked;

            showNotification('error', 'Error', 'Ocurrió un error inesperado.');
        }
    }

    window.cambiarEstadoEstudiante = cambiarEstadoEstudiante;

    // ============================================
    // MODAL EVENT HANDLERS
    // ============================================

    function onModalShown() {
        initSelect2($(DOM.encargado));
        initSelect2($(DOM.maestra));
        initSelect2($(DOM.institucion));
        initTelefonoMask();
        $('#Nombre').focus();
    }

    function onModalHidden() {
        nuevoEstudiante();
        destroyTelefonoMask();
        $(DOM.telefono).removeClass('is-invalid is-valid');
    }

    // ============================================
    // VALIDATION SETUP
    // ============================================

    function setupPhoneValidation() {
        if (!$.validator || $.validator.methods.crphone) return;

        $.validator.addMethod('crphone', function (value) {
            if (!value) return true;
            const digits = (value.match(/\d/g) || []).join('');
            return digits.length === 8 || (digits.length === 11 && digits.startsWith('506'));
        }, 'Ingrese un teléfono válido (####-#### o +506 ####-####).');

        const $form = $('#estudianteForm');
        if ($form.length && $form.data('validator')) {
            $('#Telefono').rules('add', { crphone: true });
            $form.data('validator').settings.ignore = ':hidden:not(.select2-hidden-accessible)';
        }
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        if (isMobileView() && mobileState.allStudents.length > 0) {
            renderMobileStudentCards();
        }
    }, 250);

    // ============================================
    // INITIAL DATA LOADING
    // ============================================

    async function loadInitialData() {
        showLoading(true, 'Cargando estudiantes...');

        try {
            // Load busetas for the form
            await cargarBusetas(false);
            initSelect2Multiple($(DOM.busetas));

            // Initialize DataTable for desktop
            if (!isMobileView()) {
                dataTableInstance = GestionCommon.initDataTableInstance('tablaEstudiantes', [7, 8], {
                    order: [[0, 'asc']],
                    pageLength: 10
                });
            }

            // Initialize mobile view
            if (isMobileView()) {
                initMobileView();
            }

            isPageLoaded = true;

        } catch (error) {
            console.error('Error loading initial data:', error);
            showNotification('error', 'Error de carga', 'No se pudieron cargar los datos iniciales.');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initPage() {
        // Cache DOM elements
        DOM.modal = $('#modalEstudiante');
        DOM.form = document.getElementById('estudianteForm');
        DOM.encargado = document.getElementById('IdEncargado');
        DOM.maestra = document.getElementById('IdMaestra');
        DOM.institucion = document.getElementById('IdInstitucion');
        DOM.telefono = document.getElementById('Telefono');
        DOM.busetas = document.getElementById('Busetas');
        DOM.loadingOverlay = document.getElementById('loading-overlay');

        // Mobile elements
        DOM.studentCardsContainer = document.getElementById('studentCardsContainer');
        DOM.mobileSearch = document.getElementById('mobileSearchEstudiantes');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstado');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById('mobilePaginationEstudiantes');

        // Show loading overlay immediately
        showLoading(true, 'Cargando estudiantes...');

        // Setup phone validation
        setupPhoneValidation();

        // Modal events
        const modalElement = document.getElementById('modalEstudiante');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', onModalShown);
            modalElement.addEventListener('hidden.bs.modal', onModalHidden);
        }

        // Form submit handler
        if (DOM.form) {
            DOM.form.addEventListener('submit', handleFormSubmit);
        }

        // Attach mobile event handlers
        attachMobileEventHandlers();

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Handle SweetAlert payload from server
        if (window.__swalPayload && window.__swalPayload.type) {
            const { type, title, text } = window.__swalPayload;
            if (type && title) {
                setTimeout(() => showNotification(type, title, text), 500);
            }
        }

        // Load initial data
        loadInitialData();
    }

    // ============================================
    // DOCUMENT READY
    // ============================================

    $(function () {
        initPage();
    });

})();