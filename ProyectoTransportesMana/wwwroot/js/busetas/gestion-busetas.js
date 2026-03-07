(function () {
    'use strict';

    // ============================================
    // MODULE STATE
    // ============================================
    let dataTableInstance = null;
    let isPageLoaded = false;
    let currentAssignmentBusetaId = null;

    // Mobile pagination state
    const mobileState = {
        allBusetas: [],
        filteredBusetas: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        filterEstado: ''
    };

    // Occupancy data from con-asignaciones endpoint
    let occupancyMap = {};

    // Cached student lookup data
    let estudiantesLookup = [];

    // DOM Elements (cached on init)
    const DOM = {
        modal: null,
        form: null,
        loadingOverlay: null,
        modalAsignaciones: null,
        busetaCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobilePageSize: null,
        mobilePagination: null
    };

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
    // API FUNCTIONS
    // ============================================

    async function cargarBusetas() {
        showLoading(true, 'Cargando busetas...');

        try {
            const [busetasRes, asignacionesRes] = await Promise.all([
                fetch('/GestionBusetas/Listar'),
                fetch('/GestionBusetas/ConAsignaciones')
            ]);

            if (!busetasRes.ok) throw new Error('No se pudieron cargar busetas');
            const busetas = await busetasRes.json();

            // Build occupancy map from con-asignaciones data (flat DTO)
            occupancyMap = {};
            if (asignacionesRes.ok) {
                try {
                    const asignacionesData = await asignacionesRes.json();
                    if (Array.isArray(asignacionesData)) {
                        asignacionesData.forEach(item => {
                            const id = item.id || item.Id;
                            if (id != null) {
                                occupancyMap[id] = {
                                    totalAsignaciones: item.totalAsignaciones || item.TotalAsignaciones || 0
                                };
                            }
                        });
                    }
                } catch (e) {
                    console.warn('Could not parse occupancy data:', e);
                }
            }

            // Update stats
            updateStats(busetas);

            // Store data for mobile
            mobileState.allBusetas = busetas || [];
            mobileState.filteredBusetas = [...mobileState.allBusetas];

            // Render based on view
            if (isMobileView()) {
                renderMobileBusetaCards();
            } else {
                renderDesktopTable(busetas);
            }

            isPageLoaded = true;
        } catch (error) {
            console.error('Error loading busetas:', error);
            showNotification('error', 'Error', 'No se pudieron cargar las busetas');
        } finally {
            showLoading(false);
        }
    }

    function updateStats(data) {
        const total = data?.length || 0;
        const activas = data?.filter(b => b.activa === true).length || 0;

        let totalEstudiantes = 0;
        let totalCapacidad = 0;

        (data || []).forEach(b => {
            const occ = occupancyMap[b.id] || {};
            totalEstudiantes += occ.totalAsignaciones || 0;
            totalCapacidad += b.capacidad || 0;
        });

        const ocupacionPct = totalCapacidad > 0
            ? Math.round((totalEstudiantes / totalCapacidad) * 100)
            : 0;

        const el = (id) => document.getElementById(id);
        const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

        set('stats-total-busetas', total);
        set('stats-busetas-activas', activas);
        set('stats-estudiantes-asignados', totalEstudiantes);
        set('stats-ocupacion-general', ocupacionPct + '%');
    }

    // ============================================
    // DESKTOP TABLE RENDERING
    // ============================================

    function renderDesktopTable(data) {
        if (dataTableInstance) {
            dataTableInstance.destroy();
            dataTableInstance = null;
        }

        const tbody = document.getElementById('tbodyBusetas');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No hay busetas registradas
                    </td>
                </tr>
            `;
            initDataTable();
            return;
        }

        data.forEach(b => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', b.id);

            const occ = occupancyMap[b.id] || {};
            const asignados = occ.totalAsignaciones || 0;
            const capacidad = b.capacidad || 0;
            const pct = capacidad > 0 ? Math.round((asignados / capacidad) * 100) : 0;
            const barColor = pct > 80 ? 'var(--tm-danger, #dc2626)' : pct > 60 ? 'var(--tm-accent, #f59e0b)' : 'var(--tm-secondary, #0d9488)';

            const statusHtml = `
                <div class="form-check form-switch d-flex justify-content-center">
                    <input class="form-check-input" type="checkbox" role="switch"
                           id="estado-${b.id}"
                           ${b.activa ? 'checked' : ''}
                           onchange="cambiarEstadoBuseta(${b.id}, this.checked)" />
                </div>
            `;

            const occupancyHtml = `
                <div class="tm-occupancy-mini" title="${asignados}/${capacidad} (${pct}%)">
                    <div class="tm-occupancy-bar">
                        <div class="tm-occupancy-fill" style="width: ${pct}%; background: ${barColor};"></div>
                    </div>
                    <span class="tm-occupancy-text">${asignados}/${capacidad}</span>
                </div>
            `;

            tr.innerHTML = `
                <td><strong>${escapeHtml(b.placa)}</strong></td>
                <td>${escapeHtml(b.nombreConductor)}</td>
                <td>${escapeHtml(b.cedulaConductor)}</td>
                <td class="text-center">${b.capacidad}</td>
                <td>${escapeHtml(b.jornada)}</td>
                <td>${escapeHtml(b.horarioServicio)}</td>
                <td class="text-center">${occupancyHtml}</td>
                <td class="text-center">${statusHtml}</td>
                <td class="text-center">
                    <div class="tm-action-buttons">
                        <button class="tm-btn tm-btn-sm tm-btn-outline"
                                title="Editar"
                                onclick="editarBuseta(${b.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="tm-btn tm-btn-sm tm-btn-danger"
                                title="Eliminar"
                                onclick="eliminarBuseta(${b.id}, '${escapeAttr(b.placa)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                        <button class="tm-btn tm-btn-sm tm-btn-primary"
                                title="Ver Asignaciones"
                                onclick="verAsignaciones(${b.id})">
                            <i class="bi bi-people"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        initDataTable();
    }

    function initDataTable() {
        dataTableInstance = GestionCommon.initDataTableInstance('tablaBusetas', [6, 7, 8], {
            order: [[0, 'asc']],
            pageLength: 10
        });
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterBusetas() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;

        mobileState.filteredBusetas = mobileState.allBusetas.filter(buseta => {
            let matchesSearch = true;
            if (searchTerm) {
                const placa = (buseta.placa || '').toLowerCase();
                const conductor = (buseta.nombreConductor || '').toLowerCase();
                const cedula = (buseta.cedulaConductor || '').toLowerCase();
                const jornada = (buseta.jornada || '').toLowerCase();

                matchesSearch = placa.includes(searchTerm) ||
                    conductor.includes(searchTerm) ||
                    cedula.includes(searchTerm) ||
                    jornada.includes(searchTerm);
            }

            let matchesStatus = true;
            if (filterEstado === 'activo') {
                matchesStatus = buseta.activa === true;
            } else if (filterEstado === 'inactivo') {
                matchesStatus = buseta.activa === false;
            }

            return matchesSearch && matchesStatus;
        });

        mobileState.currentPage = 1;
    }

    function getPagedBusetas() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredBusetas.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredBusetas.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileBusetaCards();

        if (DOM.busetaCardsContainer) {
            DOM.busetaCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.goToPageBusetas = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createBusetaCardHtml(buseta) {
        const statusClass = buseta.activa ? 'active' : 'inactive';
        const statusBadge = GestionCommon.createStatusBadgeHtml(buseta.activa, STATUS_LABELS);

        const occ = occupancyMap[buseta.id] || {};
        const asignados = occ.totalAsignaciones || 0;
        const capacidad = buseta.capacidad || 0;
        const pct = capacidad > 0 ? Math.round((asignados / capacidad) * 100) : 0;

        return `
            <div class="tm-buseta-card ${statusClass}" data-id="${buseta.id}">
                <div class="tm-buseta-card-header"
                     data-bs-toggle="collapse"
                     data-bs-target="#buseta-details-${buseta.id}"
                     aria-expanded="false"
                     aria-controls="buseta-details-${buseta.id}">
                    <div class="tm-buseta-info">
                        <div class="tm-buseta-title-row">
                            <span class="tm-buseta-name">${escapeHtml(buseta.placa)}</span>
                            ${statusBadge}
                        </div>
                        <div class="tm-buseta-meta">
                            <span class="tm-buseta-meta-item">
                                <i class="bi bi-person"></i>
                                ${escapeHtml(buseta.nombreConductor || 'Sin conductor')}
                            </span>
                            <span class="tm-buseta-meta-item">
                                <i class="bi bi-people"></i>
                                ${asignados}/${capacidad} (${pct}%)
                            </span>
                        </div>
                    </div>
                    <div class="tm-buseta-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="buseta-details-${buseta.id}">
                    <div class="tm-buseta-card-body">
                        <div class="tm-buseta-details">
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Placa</span>
                                <span class="tm-buseta-detail-value">${escapeHtml(buseta.placa || '—')}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Conductor</span>
                                <span class="tm-buseta-detail-value">${escapeHtml(buseta.nombreConductor || '—')}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Cédula</span>
                                <span class="tm-buseta-detail-value">${escapeHtml(buseta.cedulaConductor || '—')}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Capacidad</span>
                                <span class="tm-buseta-detail-value">${buseta.capacidad}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Jornada</span>
                                <span class="tm-buseta-detail-value">${escapeHtml(buseta.jornada || '—')}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Horario</span>
                                <span class="tm-buseta-detail-value">${escapeHtml(buseta.horarioServicio || '—')}</span>
                            </div>
                            <div class="tm-buseta-detail-item">
                                <span class="tm-buseta-detail-label">Estado</span>
                                <span class="tm-buseta-detail-value">${buseta.activa ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                        <div class="tm-buseta-actions">
                            <div class="tm-buseta-actions-left">
                                <div class="form-check form-switch">
                                    <input class="form-check-input"
                                           type="checkbox"
                                           role="switch"
                                           id="mobile-estado-${buseta.id}"
                                           ${buseta.activa ? 'checked' : ''}
                                           onchange="cambiarEstadoBuseta(${buseta.id}, this.checked)">
                                    <label class="form-check-label small" for="mobile-estado-${buseta.id}">
                                        ${buseta.activa ? 'Activa' : 'Inactiva'}
                                    </label>
                                </div>
                            </div>
                            <div class="tm-buseta-actions-right">
                                <button class="tm-btn tm-btn-sm tm-btn-outline"
                                        onclick="editarBuseta(${buseta.id})"
                                        title="Editar">
                                    <i class="bi bi-pencil me-1"></i>Editar
                                </button>
                                <button class="tm-btn tm-btn-sm tm-btn-primary"
                                        onclick="verAsignaciones(${buseta.id})"
                                        title="Asignaciones">
                                    <i class="bi bi-people me-1"></i>
                                </button>
                                <button class="tm-btn tm-btn-sm tm-btn-danger"
                                        onclick="eliminarBuseta(${buseta.id}, '${escapeAttr(buseta.placa)}')"
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
            filterEstado: mobileState.filterEstado
        };

        return GestionCommon.createEmptyStateHtml(state, {
            iconFiltered: 'bi-search',
            iconEmpty: 'bi-bus-front',
            messageFiltered: 'No se encontraron busetas',
            messageEmpty: 'No hay busetas registradas',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Haga clic en "Nueva Buseta" para agregar una'
        });
    }

    function createPaginationHtml() {
        const totalBusetas = mobileState.filteredBusetas.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalBusetas === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalBusetas);

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
                        onclick="goToPageBusetas(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalBusetas}</strong> busetas
            </div>
            <div class="tm-pagination-controls">
                <button type="button"
                        class="tm-page-btn tm-page-prev"
                        onclick="goToPageBusetas(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button"
                        class="tm-page-btn tm-page-next"
                        onclick="goToPageBusetas(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileBusetaCards() {
        if (!DOM.busetaCardsContainer) return;

        const pagedBusetas = getPagedBusetas();

        if (pagedBusetas.length === 0) {
            DOM.busetaCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.busetaCardsContainer.innerHTML = pagedBusetas
                .map(buseta => createBusetaCardHtml(buseta))
                .join('');
        }

        if (DOM.mobilePagination) {
            if (mobileState.filteredBusetas.length > 0) {
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

    function nuevaBuseta() {
        document.getElementById('IdBuseta').value = '0';
        document.getElementById('Placa').value = '';
        document.getElementById('CedulaConductor').value = '';
        document.getElementById('NombreConductor').value = '';
        document.getElementById('Capacidad').value = '';
        document.getElementById('Jornada').value = '';
        document.getElementById('HorarioServicio').value = '';
        document.getElementById('Activa').checked = true;

        document.getElementById('modalBusetaLabel').innerHTML = '<i class="bi bi-bus-front me-2"></i>Registrar Buseta';

        const form = document.getElementById('busetaForm');
        if (form) {
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
        }
    }

    window.nuevaBuseta = nuevaBuseta;

    function editarBuseta(id) {
        showLoading(true, 'Cargando datos de la buseta...');

        fetch(`/GestionBusetas/Obtener?id=${id}`)
            .then(res => {
                if (!res.ok) throw new Error('No se pudo obtener la buseta');
                return res.json();
            })
            .then(b => {
                document.getElementById('IdBuseta').value = b.id;
                document.getElementById('Placa').value = b.placa || '';
                document.getElementById('CedulaConductor').value = b.cedulaConductor || '';
                document.getElementById('NombreConductor').value = b.nombreConductor || '';
                document.getElementById('Capacidad').value = b.capacidad || '';
                document.getElementById('Jornada').value = b.jornada || '';
                document.getElementById('HorarioServicio').value = b.horarioServicio || '';
                document.getElementById('Activa').checked = b.activa === true;

                document.getElementById('modalBusetaLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Buseta';

                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalBuseta'));
                modal.show();
                showLoading(false);
            })
            .catch(err => {
                showLoading(false);
                console.error('Error loading buseta:', err);
                showNotification('error', 'Error', 'No se pudo cargar la información de la buseta');
            });
    }

    window.editarBuseta = editarBuseta;

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = parseInt(document.getElementById('IdBuseta').value) || 0;
        const placa = document.getElementById('Placa').value.trim();
        const cedulaConductor = document.getElementById('CedulaConductor').value.trim();
        const nombreConductor = document.getElementById('NombreConductor').value.trim();
        const capacidad = parseInt(document.getElementById('Capacidad').value) || 0;
        const jornada = document.getElementById('Jornada').value;
        const horarioServicio = document.getElementById('HorarioServicio').value.trim();
        const activa = document.getElementById('Activa').checked;

        // Validation
        if (!placa || !cedulaConductor || !nombreConductor || !capacidad || !jornada || !horarioServicio) {
            showNotification('warning', 'Campos requeridos', 'Por favor complete todos los campos obligatorios');
            return;
        }

        const esNuevo = id === 0;

        showLoading(true, esNuevo ? 'Registrando buseta...' : 'Actualizando buseta...');

        try {
            let url, method;

            if (esNuevo) {
                url = '/GestionBusetas/Crear';
                method = 'POST';
            } else {
                url = `/GestionBusetas/Actualizar?id=${id}`;
                method = 'PUT';
            }

            const dto = {
                Placa: placa,
                Capacidad: capacidad,
                NombreConductor: nombreConductor,
                Jornada: jornada,
                HorarioServicio: horarioServicio,
                Activa: activa,
                CedulaConductor: cedulaConductor
            };

            if (!esNuevo) {
                dto.Id = id;
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Error al guardar');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalBuseta'));
            if (modal) modal.hide();

            showNotification(
                'success',
                esNuevo ? 'Buseta registrada' : 'Buseta actualizada',
                esNuevo ? 'La buseta fue registrada correctamente.' : 'Los cambios fueron guardados correctamente.',
                true
            );

            await cargarBusetas();
        } catch (error) {
            console.error('Error saving buseta:', error);
            showNotification('error', 'Error', 'No se pudo guardar la buseta');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // DELETE OPERATION
    // ============================================

    function eliminarBuseta(id, placa) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Estás seguro?',
            html: `Se eliminará la buseta: <strong>${escapeHtml(placa)}</strong>`,
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: async function () {
                showLoading(true, 'Eliminando buseta...');

                try {
                    const res = await fetch(`/GestionBusetas/Eliminar?id=${id}`, { method: 'DELETE' });

                    if (!res.ok) throw new Error('No se pudo eliminar');

                    showLoading(false);
                    showNotification('success', 'Eliminada', 'La buseta ha sido eliminada correctamente.', true);
                    await cargarBusetas();
                } catch (err) {
                    showLoading(false);
                    console.error('Error deleting:', err);
                    showNotification('error', 'Error', 'No se pudo eliminar la buseta');
                }
            }
        });
    }

    window.eliminarBuseta = eliminarBuseta;

    // ============================================
    // STATUS TOGGLE
    // ============================================

    function cambiarEstadoBuseta(id, isChecked) {
        const buseta = mobileState.allBusetas.find(b => b.id === id);
        if (!buseta) {
            showNotification('error', 'Error', 'Buseta no encontrada');
            return;
        }

        const dto = {
            Id: id,
            Placa: buseta.placa,
            Capacidad: buseta.capacidad,
            NombreConductor: buseta.nombreConductor,
            Jornada: buseta.jornada,
            HorarioServicio: buseta.horarioServicio,
            Activa: isChecked,
            CedulaConductor: buseta.cedulaConductor
        };

        fetch(`/GestionBusetas/Actualizar?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        })
            .then(res => {
                if (!res.ok) throw new Error('Error updating');

                showNotification(
                    'success',
                    'Estado actualizado',
                    `La buseta fue ${isChecked ? 'activada' : 'desactivada'} correctamente.`,
                    true
                );

                // Update local state
                buseta.activa = isChecked;

                // Update UI for mobile view
                if (isMobileView()) {
                    const card = document.querySelector(`.tm-buseta-card[data-id="${id}"]`);
                    if (card) {
                        GestionCommon.updateCardStatusBadge(card, isChecked, STATUS_LABELS);

                        const label = card.querySelector(`label[for="mobile-estado-${id}"]`);
                        if (label) {
                            label.textContent = isChecked ? 'Activa' : 'Inactiva';
                        }
                    }
                }

                // Update stats
                updateStats(mobileState.allBusetas);
            })
            .catch(() => {
                // Revert checkboxes
                const desktopCb = document.getElementById(`estado-${id}`);
                const mobileCb = document.getElementById(`mobile-estado-${id}`);
                if (desktopCb) desktopCb.checked = !isChecked;
                if (mobileCb) mobileCb.checked = !isChecked;

                showNotification('error', 'Error', 'No se pudo actualizar el estado');
            });
    }

    window.cambiarEstadoBuseta = cambiarEstadoBuseta;

    // ============================================
    // STUDENT LOOKUP & SELECT2
    // ============================================

    async function cargarEstudiantesLookup() {
        if (estudiantesLookup.length > 0) return estudiantesLookup;

        try {
            const res = await fetch('/GestionBusetas/EstudiantesLookup');
            if (!res.ok) throw new Error('Error al cargar estudiantes');
            estudiantesLookup = await res.json();
        } catch (err) {
            console.error('Error loading student lookup:', err);
            estudiantesLookup = [];
        }
        return estudiantesLookup;
    }

    function initEstudianteSelect2(currentAssignments) {
        const $select = $('#selectEstudiante');

        // Destroy existing Select2 instance if present
        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }

        // Clear existing options
        $select.empty().append('<option value=""></option>');

        // Get IDs of already-assigned students
        const assignedIds = new Set((currentAssignments || []).map(a => a.idEstudiante));

        // Populate with available students
        estudiantesLookup.forEach(est => {
            if (!assignedIds.has(est.idEstudiante)) {
                const label = est.nombreCompleto +
                    (est.seccion ? ' — ' + est.seccion : '') +
                    (est.institucion ? ' (' + est.institucion + ')' : '');
                $select.append(new Option(label, est.idEstudiante, false, false));
            }
        });

        // Initialize Select2
        $select.select2({
            theme: 'bootstrap-5',
            placeholder: 'Buscar estudiante...',
            allowClear: true,
            width: '100%',
            dropdownParent: $('#modalAsignaciones')
        });
    }

    // ============================================
    // ASSIGNMENTS MODAL
    // ============================================

    async function verAsignaciones(idBuseta) {
        currentAssignmentBusetaId = idBuseta;
        showLoading(true, 'Cargando asignaciones...');

        try {
            const [busetaRes, asigRes] = await Promise.all([
                fetch(`/GestionBusetas/Obtener?id=${idBuseta}`),
                fetch(`/GestionBusetas/Asignaciones?idBuseta=${idBuseta}`),
                cargarEstudiantesLookup()
            ]);

            if (!busetaRes.ok) throw new Error('No se pudo obtener la buseta');
            const buseta = await busetaRes.json();

            let asignaciones = [];
            if (asigRes.ok) {
                asignaciones = await asigRes.json();
            }

            // Set modal title
            document.getElementById('asignacionPlaca').textContent = buseta.placa || '';

            // Render bus info summary
            renderBusInfoSummary(buseta, asignaciones.length);

            // Render capacity bar
            renderCapacityBar(buseta, asignaciones.length);

            // Render assignments table
            renderAssignmentsTable(asignaciones);

            // Init student dropdown (filter out already-assigned)
            initEstudianteSelect2(asignaciones);

            // Open modal
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAsignaciones'));
            modal.show();
        } catch (err) {
            console.error('Error loading assignments:', err);
            showNotification('error', 'Error', 'No se pudieron cargar las asignaciones');
        } finally {
            showLoading(false);
        }
    }

    window.verAsignaciones = verAsignaciones;

    function renderBusInfoSummary(buseta, totalAsignados) {
        const container = document.getElementById('busInfoSummary');
        if (!container) return;

        container.innerHTML = `
            <div class="row g-2 mb-2">
                <div class="col-sm-3">
                    <small class="text-muted d-block">Placa</small>
                    <strong>${escapeHtml(buseta.placa)}</strong>
                </div>
                <div class="col-sm-3">
                    <small class="text-muted d-block">Conductor</small>
                    <strong>${escapeHtml(buseta.nombreConductor)}</strong>
                </div>
                <div class="col-sm-3">
                    <small class="text-muted d-block">Capacidad</small>
                    <strong>${buseta.capacidad}</strong>
                </div>
                <div class="col-sm-3">
                    <small class="text-muted d-block">Estado</small>
                    ${GestionCommon.createStatusBadgeHtml(buseta.activa, STATUS_LABELS)}
                </div>
            </div>
        `;
    }

    function renderCapacityBar(buseta, totalAsignados) {
        const container = document.getElementById('capacityBarContainer');
        if (!container) return;

        const capacidad = buseta.capacidad || 0;
        const pct = capacidad > 0 ? Math.round((totalAsignados / capacidad) * 100) : 0;
        const barClass = pct > 80 ? 'bg-danger' : pct > 60 ? 'bg-warning' : 'bg-success';
        const disponibles = Math.max(0, capacidad - totalAsignados);

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-muted">Ocupación: ${totalAsignados}/${capacidad}</small>
                <small class="text-muted">${disponibles} disponible(s)</small>
            </div>
            <div class="progress" style="height: 10px;">
                <div class="progress-bar ${barClass}" role="progressbar"
                     style="width: ${pct}%" aria-valuenow="${pct}"
                     aria-valuemin="0" aria-valuemax="100">
                    ${pct}%
                </div>
            </div>
        `;
    }

    function renderAssignmentsTable(asignaciones) {
        const tbody = document.getElementById('tbodyAsignaciones');
        if (!tbody) return;

        if (!asignaciones || asignaciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-person-x fs-3 d-block mb-2"></i>
                        No hay estudiantes asignados a esta buseta
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = asignaciones.map(a => {
            return `
                <tr data-id="${a.idAsignacion}">
                    <td>${escapeHtml(a.nombreEstudiante || 'ID: ' + a.idEstudiante)}</td>
                    <td>${escapeHtml(a.seccion || '—')}</td>
                    <td>${escapeHtml(a.nombreInstitucion || '—')}</td>
                    <td class="text-center">
                        <button class="tm-btn tm-btn-sm tm-btn-danger"
                                title="Eliminar asignación"
                                onclick="eliminarAsignacion(${a.idAsignacion})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function agregarAsignacion() {
        const $select = $('#selectEstudiante');
        const idEstudiante = parseInt($select.val());

        if (!idEstudiante || idEstudiante < 1) {
            showNotification('warning', 'Seleccione un estudiante', 'Debe seleccionar un estudiante de la lista');
            return;
        }

        if (!currentAssignmentBusetaId) return;

        try {
            const dto = {
                IdEstudiante: idEstudiante,
                IdBuseta: currentAssignmentBusetaId
            };

            const res = await fetch(`/GestionBusetas/CrearAsignacion?idBuseta=${currentAssignmentBusetaId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || 'Error al crear asignación');
            }

            $select.val(null).trigger('change');
            showNotification('success', 'Asignación creada', 'El estudiante fue asignado correctamente.', true);

            // Refresh assignments in modal
            await refreshAssignments();
            // Refresh main table stats
            await cargarBusetas();
        } catch (err) {
            console.error('Error creating assignment:', err);
            showNotification('error', 'Error', 'No se pudo crear la asignación');
        }
    }

    function eliminarAsignacion(idAsignacion) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Eliminar asignación?',
            html: 'Se eliminará esta asignación de estudiante.',
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: async function () {
                try {
                    const res = await fetch(`/GestionBusetas/EliminarAsignacion?idAsignacion=${idAsignacion}`, {
                        method: 'DELETE'
                    });

                    if (!res.ok) throw new Error('No se pudo eliminar');

                    showNotification('success', 'Eliminada', 'La asignación fue eliminada correctamente.', true);

                    // Refresh assignments in modal
                    await refreshAssignments();
                    // Refresh main table stats
                    await cargarBusetas();
                } catch (err) {
                    console.error('Error deleting assignment:', err);
                    showNotification('error', 'Error', 'No se pudo eliminar la asignación');
                }
            }
        });
    }

    window.eliminarAsignacion = eliminarAsignacion;

    async function refreshAssignments() {
        if (!currentAssignmentBusetaId) return;

        try {
            const [busetaRes, asigRes] = await Promise.all([
                fetch(`/GestionBusetas/Obtener?id=${currentAssignmentBusetaId}`),
                fetch(`/GestionBusetas/Asignaciones?idBuseta=${currentAssignmentBusetaId}`)
            ]);

            if (!busetaRes.ok) return;
            const buseta = await busetaRes.json();

            let asignaciones = [];
            if (asigRes.ok) {
                asignaciones = await asigRes.json();
            }

            renderBusInfoSummary(buseta, asignaciones.length);
            renderCapacityBar(buseta, asignaciones.length);
            renderAssignmentsTable(asignaciones);

            // Re-init Select2 to remove newly-assigned student from dropdown
            initEstudianteSelect2(asignaciones);
        } catch (err) {
            console.error('Error refreshing assignments:', err);
        }
    }

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
                    filterBusetas();
                    renderMobileBusetaCards();
                }, 300);
            });
        }

        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterBusetas();
                renderMobileBusetaCards();
            });
        }

        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileBusetaCards();
            });
        }
    }

    // ============================================
    // MODAL EVENT HANDLERS
    // ============================================

    function onModalShown() {
        document.getElementById('Placa').focus();
    }

    function onModalHidden() {
        nuevaBuseta();
    }

    function onAsignacionesModalHidden() {
        currentAssignmentBusetaId = null;
        const $select = $('#selectEstudiante');
        if ($select.hasClass('select2-hidden-accessible')) {
            $select.select2('destroy');
        }
        $select.empty().append('<option value=""></option>');
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        if (isPageLoaded) {
            if (isMobileView()) {
                renderMobileBusetaCards();
            } else {
                renderDesktopTable(mobileState.allBusetas);
            }
        }
    }, 250);

    // ============================================
    // INITIALIZATION
    // ============================================

    async function initPage() {
        // Cache DOM elements
        DOM.modal = document.getElementById('modalBuseta');
        DOM.form = document.getElementById('busetaForm');
        DOM.loadingOverlay = document.getElementById('loading-overlay');
        DOM.modalAsignaciones = document.getElementById('modalAsignaciones');

        // Mobile elements
        DOM.busetaCardsContainer = document.getElementById('busetaCardsContainer');
        DOM.mobileSearch = document.getElementById('mobileSearchBusetas');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstadoBusetas');
        DOM.mobilePageSize = document.getElementById('mobilePageSizeBusetas');
        DOM.mobilePagination = document.getElementById('mobilePaginationBusetas');

        // Show loading overlay immediately
        showLoading(true, 'Cargando busetas...');

        // Modal events - Create/Edit
        if (DOM.modal) {
            DOM.modal.addEventListener('shown.bs.modal', onModalShown);
            DOM.modal.addEventListener('hidden.bs.modal', onModalHidden);
        }

        // Modal events - Assignments
        if (DOM.modalAsignaciones) {
            DOM.modalAsignaciones.addEventListener('hidden.bs.modal', onAsignacionesModalHidden);
        }

        // Form submit handler
        if (DOM.form) {
            DOM.form.addEventListener('submit', handleFormSubmit);
        }

        // Add assignment button
        const btnAgregar = document.getElementById('btnAgregarAsignacion');
        if (btnAgregar) {
            btnAgregar.addEventListener('click', agregarAsignacion);
        }

        // Attach mobile event handlers
        attachMobileEventHandlers();

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Load initial data
        try {
            await cargarBusetas();
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
