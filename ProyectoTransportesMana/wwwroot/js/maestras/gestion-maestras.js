(function () {
    'use strict';

    // ============================================
    // API CONFIGURATION (PRESERVED FROM ORIGINAL)
    // ============================================
    const base = window.API_BASE || "";
    const API = `${base}/api/v1/gestion-maestras`;

    // ============================================
    // MODULE STATE
    // ============================================
    let dataTableInstance = null;
    let isPageLoaded = false;

    // Mobile pagination state using common structure
    const mobileState = {
        allMaestras: [],
        filteredMaestras: [],
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
        // Mobile elements
        maestraCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobilePageSize: null,
        mobilePagination: null
    };

    // Status labels for maestras (feminine form)
    const STATUS_LABELS = { active: 'Activa', inactive: 'Inactiva' };

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
    // API FUNCTIONS (USING ORIGINAL ENDPOINTS)
    // ============================================

    async function cargarInstituciones() {
        try {
            const response = await fetch('/GestionMaestras/InstitucionesLookup');
            if (!response.ok) throw new Error('No se pudieron cargar instituciones');
            const data = await response.json();

            const select = document.getElementById('IdInstitucion');
            if (!select) return;

            select.innerHTML = '<option value="">Seleccione una institución</option>';
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.idInstitucion;
                option.textContent = item.nombre;
                select.appendChild(option);
            });

            return data;
        } catch (error) {
            console.error('Error loading instituciones:', error);
            return [];
        }
    }

    async function listarMaestras() {
        showLoading(true, 'Cargando maestras...');

        try {
            const response = await fetch(API);
            if (!response.ok) throw new Error('No se pudieron cargar maestras');
            const data = await response.json();

            // Update stats
            updateStats(data);

            // Store data for mobile
            mobileState.allMaestras = data || [];
            mobileState.filteredMaestras = [...mobileState.allMaestras];

            // Render based on view
            if (isMobileView()) {
                renderMobileMaestraCards();
            } else {
                renderDesktopTable(data);
            }

            isPageLoaded = true;
        } catch (error) {
            console.error('Error loading maestras:', error);
            showNotification('error', 'Error', 'No se pudieron cargar las maestras');
        } finally {
            showLoading(false);
        }
    }

    function updateStats(data) {
        const total = data?.length || 0;
        const activas = data?.filter(m => m.activo === true).length || 0;
        const instituciones = [...new Set(data?.map(m => m.institucion).filter(Boolean))].length || 0;

        const totalEl = document.getElementById('stats-total-maestras');
        const activasEl = document.getElementById('stats-maestras-activas');
        const institucionesEl = document.getElementById('stats-instituciones');

        if (totalEl) totalEl.textContent = total;
        if (activasEl) activasEl.textContent = activas;
        if (institucionesEl) institucionesEl.textContent = instituciones;
    }

    // ============================================
    // DESKTOP TABLE RENDERING
    // ============================================

    function renderDesktopTable(data) {
        // Destroy existing DataTable
        if (dataTableInstance) {
            dataTableInstance.destroy();
            dataTableInstance = null;
        }

        const tbody = document.getElementById('tbodyMaestras');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No hay maestras registradas
                    </td>
                </tr>
            `;
            initDataTableInstance();
            return;
        }

        data.forEach(m => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', m.idMaestra);

            const statusHtml = `
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" role="switch" 
                           id="estado-${m.idMaestra}" 
                           ${m.activo ? 'checked' : ''}
                           onchange="cambiarEstadoMaestra(${m.idMaestra}, this.checked)" />
                </div>
            `;

            tr.innerHTML = `
                <td>${escapeHtml(m.nombre)}</td>
                <td>${escapeHtml(m.institucion)}</td>
                <td>${escapeHtml(m.seccion)}</td>
                <td class="text-center">${statusHtml}</td>
                <td class="text-center">
                    <div class="tm-action-buttons">
                        <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                title="Editar" 
                                onclick="editarMaestra(${m.idMaestra})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                title="Eliminar" 
                                onclick="eliminarMaestra(${m.idMaestra}, '${escapeAttr(m.nombre)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        initDataTableInstance();
    }

    function initDataTableInstance() {
        dataTableInstance = GestionCommon.initDataTableInstance('tablaMaestras', [3, 4], {
            order: [[0, 'asc']],
            pageLength: 10
        });
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterMaestras() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;

        mobileState.filteredMaestras = mobileState.allMaestras.filter(maestra => {
            let matchesSearch = true;
            if (searchTerm) {
                const nombre = (maestra.nombre || '').toLowerCase();
                const institucion = (maestra.institucion || '').toLowerCase();
                const seccion = (maestra.seccion || '').toLowerCase();

                matchesSearch = nombre.includes(searchTerm) ||
                    institucion.includes(searchTerm) ||
                    seccion.includes(searchTerm);
            }

            let matchesStatus = true;
            if (filterEstado === 'activo') {
                matchesStatus = maestra.activo === true;
            } else if (filterEstado === 'inactivo') {
                matchesStatus = maestra.activo === false;
            }

            return matchesSearch && matchesStatus;
        });

        mobileState.currentPage = 1;
    }

    function getPagedMaestras() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredMaestras.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredMaestras.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileMaestraCards();

        if (DOM.maestraCardsContainer) {
            DOM.maestraCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.goToPageMaestras = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createMaestraCardHtml(maestra) {
        const statusClass = maestra.activo ? 'active' : 'inactive';
        const statusBadge = GestionCommon.createStatusBadgeHtml(maestra.activo, STATUS_LABELS);

        return `
            <div class="tm-maestra-card ${statusClass}" data-id="${maestra.idMaestra}">
                <div class="tm-maestra-card-header" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#maestra-details-${maestra.idMaestra}" 
                     aria-expanded="false"
                     aria-controls="maestra-details-${maestra.idMaestra}">
                    <div class="tm-maestra-info">
                        <div class="tm-maestra-title-row">
                            <span class="tm-maestra-name">${escapeHtml(maestra.nombre)}</span>
                            ${statusBadge}
                        </div>
                        <div class="tm-maestra-meta">
                            <span class="tm-maestra-meta-item">
                                <i class="bi bi-building"></i>
                                ${escapeHtml(maestra.institucion || 'Sin institución')}
                            </span>
                            <span class="tm-maestra-meta-item">
                                <i class="bi bi-bookmark"></i>
                                ${escapeHtml(maestra.seccion || 'Sin sección')}
                            </span>
                        </div>
                    </div>
                    <div class="tm-maestra-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="maestra-details-${maestra.idMaestra}">
                    <div class="tm-maestra-card-body">
                        <div class="tm-maestra-details">
                            <div class="tm-maestra-detail-item">
                                <span class="tm-maestra-detail-label">Nombre Completo</span>
                                <span class="tm-maestra-detail-value">${escapeHtml(maestra.nombre || '—')}</span>
                            </div>
                            <div class="tm-maestra-detail-item">
                                <span class="tm-maestra-detail-label">Institución</span>
                                <span class="tm-maestra-detail-value">${escapeHtml(maestra.institucion || '—')}</span>
                            </div>
                            <div class="tm-maestra-detail-item">
                                <span class="tm-maestra-detail-label">Sección</span>
                                <span class="tm-maestra-detail-value">${escapeHtml(maestra.seccion || '—')}</span>
                            </div>
                            <div class="tm-maestra-detail-item">
                                <span class="tm-maestra-detail-label">Estado</span>
                                <span class="tm-maestra-detail-value">${maestra.activo ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                        <div class="tm-maestra-actions">
                            <div class="tm-maestra-actions-left">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" 
                                           type="checkbox" 
                                           role="switch"
                                           id="mobile-estado-${maestra.idMaestra}"
                                           ${maestra.activo ? 'checked' : ''}
                                           onchange="cambiarEstadoMaestra(${maestra.idMaestra}, this.checked)">
                                    <label class="form-check-label small" for="mobile-estado-${maestra.idMaestra}">
                                        ${maestra.activo ? 'Activa' : 'Inactiva'}
                                    </label>
                                </div>
                            </div>
                            <div class="tm-maestra-actions-right">
                                <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                        onclick="editarMaestra(${maestra.idMaestra})"
                                        title="Editar">
                                    <i class="bi bi-pencil me-1"></i>
                                    Editar
                                </button>
                                <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                        onclick="eliminarMaestra(${maestra.idMaestra}, '${escapeAttr(maestra.nombre)}')"
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
            iconEmpty: 'bi-person-badge',
            messageFiltered: 'No se encontraron maestras',
            messageEmpty: 'No hay maestras registradas',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Haga clic en "Nueva Maestra" para agregar una'
        });
    }

    function createPaginationHtml() {
        const totalMaestras = mobileState.filteredMaestras.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalMaestras === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalMaestras);

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
                        onclick="goToPageMaestras(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalMaestras}</strong> maestras
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageMaestras(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageMaestras(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileMaestraCards() {
        if (!DOM.maestraCardsContainer) return;

        const pagedMaestras = getPagedMaestras();

        if (pagedMaestras.length === 0) {
            DOM.maestraCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.maestraCardsContainer.innerHTML = pagedMaestras
                .map(maestra => createMaestraCardHtml(maestra))
                .join('');
        }

        if (DOM.mobilePagination) {
            if (mobileState.filteredMaestras.length > 0) {
                DOM.mobilePagination.innerHTML = createPaginationHtml();
                DOM.mobilePagination.style.display = '';
            } else {
                DOM.mobilePagination.innerHTML = '';
                DOM.mobilePagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // FORM HANDLING (USING ORIGINAL API ENDPOINTS)
    // ============================================

    function nuevaMaestra() {
        document.getElementById('IdMaestra').value = '';
        document.getElementById('Nombre').value = '';
        document.getElementById('Seccion').value = '';
        document.getElementById('Activo').checked = true;

        const institucionSelect = document.getElementById('IdInstitucion');
        if (institucionSelect) institucionSelect.value = '';

        document.getElementById('modalMaestraLabel').innerHTML = '<i class="bi bi-person-plus me-2"></i>Registrar Maestra';

        const form = document.getElementById('maestraForm');
        if (form) {
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        }
    }

    window.nuevaMaestra = nuevaMaestra;

    function editarMaestra(id) {
        showLoading(true, 'Cargando datos de la maestra...');

        // Using original API endpoint: GET /api/v1/gestion-maestras/{id}
        $.get(`${API}/${id}`, function (m) {
            document.getElementById('IdMaestra').value = m.idMaestra;
            document.getElementById('Nombre').value = m.nombre || '';
            document.getElementById('Seccion').value = m.seccion || '';
            document.getElementById('Activo').checked = m.activo === true;

            const institucionSelect = document.getElementById('IdInstitucion');
            if (institucionSelect) {
                institucionSelect.value = String(m.idInstitucion || '');
            }

            document.getElementById('modalMaestraLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Maestra';

            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMaestra'));
            modal.show();
            showLoading(false);
        }).fail(function () {
            showLoading(false);
            showNotification('error', 'Error', 'No se pudo cargar la información de la maestra');
        });
    }

    window.editarMaestra = editarMaestra;

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('IdMaestra').value;
        const nombre = document.getElementById('Nombre').value.trim();
        const seccion = document.getElementById('Seccion').value.trim();
        const activo = document.getElementById('Activo').checked;
        const idInstitucionRaw = document.getElementById('IdInstitucion').value;

        // Validation
        if (!nombre || !seccion) {
            showNotification('warning', 'Campos requeridos', 'Por favor complete todos los campos obligatorios');
            return;
        }

        const esNuevo = !id;

        // Build DTO matching original structure
        const dto = {
            Nombre: nombre,
            Seccion: seccion,
            Activo: activo
        };

        if (idInstitucionRaw) {
            dto.IdInstitucion = parseInt(idInstitucionRaw, 10);
        }

        showLoading(true, esNuevo ? 'Registrando maestra...' : 'Actualizando maestra...');

        try {
            if (esNuevo) {
                // Using original API endpoint: POST /api/v1/gestion-maestras
                await $.ajax({
                    url: API,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(dto)
                });
            } else {
                // Using original API endpoint: PUT /api/v1/gestion-maestras/{id}
                dto.IdMaestra = parseInt(id);
                await $.ajax({
                    url: `${API}/${id}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(dto)
                });
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalMaestra'));
            if (modal) modal.hide();

            showNotification(
                'success',
                esNuevo ? 'Maestra registrada' : 'Maestra actualizada',
                esNuevo ? 'La maestra fue registrada correctamente.' : 'Los cambios fueron guardados correctamente.',
                true
            );

            await listarMaestras();
        } catch (error) {
            console.error('Error saving maestra:', error);
            showNotification('error', 'Error', 'No se pudo guardar la maestra');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // DELETE OPERATION (USING ORIGINAL API ENDPOINT)
    // ============================================

    function eliminarMaestra(id, nombre) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Estás seguro?',
            html: `Se desactivará la maestra: <strong>${escapeHtml(nombre)}</strong>`,
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, desactivar',
            onConfirm: function () {
                showLoading(true, 'Desactivando maestra...');

                // Using original API endpoint: DELETE /api/v1/gestion-maestras/{id}
                $.ajax({
                    url: `${API}/${id}`,
                    method: 'DELETE',
                    success: function () {
                        showLoading(false);
                        showNotification('success', 'Desactivada', 'La maestra ha sido desactivada correctamente.', true);
                        listarMaestras();
                    },
                    error: function (xhr) {
                        showLoading(false);
                        console.error('Error al eliminar:', xhr);
                        showNotification('error', 'Error', 'No se pudo desactivar la maestra');
                    }
                });
            }
        });
    }

    window.eliminarMaestra = eliminarMaestra;

    // ============================================
    // STATUS TOGGLE (USING ORIGINAL API ENDPOINT)
    // ============================================

    function cambiarEstadoMaestra(id, isChecked) {
        // Find the maestra data
        const maestra = mobileState.allMaestras.find(m => m.idMaestra === id);
        if (!maestra) {
            showNotification('error', 'Error', 'Maestra no encontrada');
            return;
        }

        // Build DTO for update
        const dto = {
            IdMaestra: id,
            Nombre: maestra.nombre,
            Seccion: maestra.seccion,
            Activo: isChecked
        };

        if (maestra.idInstitucion) {
            dto.IdInstitucion = maestra.idInstitucion;
        }

        // Using original API endpoint: PUT /api/v1/gestion-maestras/{id}
        $.ajax({
            url: `${API}/${id}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(dto),
            success: function () {
                showNotification(
                    'success',
                    'Estado actualizado',
                    `La maestra fue ${isChecked ? 'activada' : 'desactivada'} correctamente.`,
                    true
                );

                // Update local state
                maestra.activo = isChecked;

                // Update UI for mobile view using GestionCommon
                if (isMobileView()) {
                    const card = document.querySelector(`.tm-maestra-card[data-id="${id}"]`);
                    if (card) {
                        GestionCommon.updateCardStatusBadge(card, isChecked, STATUS_LABELS);

                        const label = card.querySelector(`label[for="mobile-estado-${id}"]`);
                        if (label) {
                            label.textContent = isChecked ? 'Activa' : 'Inactiva';
                        }
                    }
                }

                // Update stats
                updateStats(mobileState.allMaestras);
            },
            error: function () {
                // Revert checkboxes
                const desktopCheckbox = document.getElementById(`estado-${id}`);
                const mobileCheckbox = document.getElementById(`mobile-estado-${id}`);

                if (desktopCheckbox) desktopCheckbox.checked = !isChecked;
                if (mobileCheckbox) mobileCheckbox.checked = !isChecked;

                showNotification('error', 'Error', 'No se pudo actualizar el estado');
            }
        });
    }

    window.cambiarEstadoMaestra = cambiarEstadoMaestra;

    // ============================================
    // MOBILE EVENT HANDLERS
    // ============================================

    function attachMobileEventHandlers() {
        if (DOM.mobileSearch) {
            let searchTimeout;
            DOM.mobileSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    mobileState.searchTerm = e.target.value;
                    filterMaestras();
                    renderMobileMaestraCards();
                }, 300);
            });
        }

        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterMaestras();
                renderMobileMaestraCards();
            });
        }

        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileMaestraCards();
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
        nuevaMaestra();
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        if (isPageLoaded) {
            if (isMobileView()) {
                renderMobileMaestraCards();
            } else {
                renderDesktopTable(mobileState.allMaestras);
            }
        }
    }, 250);

    // ============================================
    // INITIALIZATION
    // ============================================

    async function initPage() {
        // Cache DOM elements
        DOM.modal = document.getElementById('modalMaestra');
        DOM.form = document.getElementById('maestraForm');
        DOM.loadingOverlay = document.getElementById('loading-overlay');

        // Mobile elements
        DOM.maestraCardsContainer = document.getElementById('maestraCardsContainer');
        DOM.mobileSearch = document.getElementById('mobileSearchMaestras');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstado');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById('mobilePaginationMaestras');

        // Show loading overlay immediately
        showLoading(true, 'Cargando maestras...');

        // Modal events
        if (DOM.modal) {
            DOM.modal.addEventListener('shown.bs.modal', onModalShown);
            DOM.modal.addEventListener('hidden.bs.modal', onModalHidden);
        }

        // Form submit handler
        if (DOM.form) {
            DOM.form.addEventListener('submit', handleFormSubmit);
        }

        // Attach mobile event handlers
        attachMobileEventHandlers();

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Load initial data
        try {
            await cargarInstituciones();
            await listarMaestras();
        } catch (error) {
            console.error('Error initializing page:', error);
            showNotification('error', 'Error', 'No se pudieron cargar los datos iniciales');
            showLoading(false);
        }
    }

    // ============================================
    // DOCUMENT READY
    // ============================================

    $(function () {
        initPage();
    });

})();