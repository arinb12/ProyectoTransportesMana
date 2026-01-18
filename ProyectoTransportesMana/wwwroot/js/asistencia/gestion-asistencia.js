(function () {
    'use strict';

    // ============================================
    // DATATABLE ERROR MODE
    // ============================================
    if ($.fn.dataTable) {
        $.fn.dataTable.ext.errMode = 'none';
    }

    // ============================================
    // MODULE STATE
    // ============================================
    const asistenciaDirtyState = {};
    const asistenciaBusetaActual = {};
    const asistenciaTipoViajeActual = {};
    const estudiantesData = {}; // Store students data per institution

    // Mobile pagination state per institution
    const mobileStates = {};

    // DOM cache
    const DOM = {
        loadingOverlay: null,
        fechaActual: null,
        statsRecogidosHoy: null
    };

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

    // ============================================
    // DATE FORMATTING
    // ============================================

    function formatCurrentDate() {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const date = new Date();
        return date.toLocaleDateString('es-ES', options);
    }

    // ============================================
    // DIRTY STATE MANAGEMENT
    // ============================================

    function marcarEscuelaDirty(escuelaId) {
        asistenciaDirtyState[escuelaId] = true;

        const card = document.querySelector(`.tm-asistencia-card[data-escuela-id="${escuelaId}"]`);
        if (card) {
            card.classList.add('has-unsaved-changes');
        }

        const indicator = document.getElementById(`dirty-indicator-${escuelaId}`);
        if (indicator) {
            indicator.style.display = 'inline-flex';
        }
    }

    function marcarEscuelaClean(escuelaId) {
        asistenciaDirtyState[escuelaId] = false;

        const card = document.querySelector(`.tm-asistencia-card[data-escuela-id="${escuelaId}"]`);
        if (card) {
            card.classList.remove('has-unsaved-changes');
        }

        const indicator = document.getElementById(`dirty-indicator-${escuelaId}`);
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // ============================================
    // UI RESET
    // ============================================

    function resetEscuelaUI(escuelaId) {
        const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
        const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);
        const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
        const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);
        const contenedorMobile = document.getElementById(`mobile-container-${escuelaId}`);
        const tablaId = `tablaAsistencia-${escuelaId}`;
        const $tabla = $(`#${tablaId}`);
        const tbody = document.querySelector(`#${tablaId} tbody`);

        // Reset selects
        if (busetaSelect) busetaSelect.value = '';
        if (tipoViajeSelect) tipoViajeSelect.value = '';

        // Show alert
        if (alerta) {
            alerta.classList.remove('d-none');
        }

        // Hide containers
        if (contenedorTabla) contenedorTabla.classList.add('d-none');
        if (contenedorMobile) contenedorMobile.classList.add('d-none');

        // Destroy DataTable
        if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
            $tabla.DataTable().clear().destroy();
        }

        // Clear tbody
        if (tbody) tbody.innerHTML = '';

        // Clear mobile cards
        const cardsContainer = document.getElementById(`estudianteCards-${escuelaId}`);
        if (cardsContainer) cardsContainer.innerHTML = '';

        // Reset state
        marcarEscuelaClean(escuelaId);
        asistenciaBusetaActual[escuelaId] = null;
        asistenciaTipoViajeActual[escuelaId] = null;
        estudiantesData[escuelaId] = [];

        // Reset mobile state
        if (mobileStates[escuelaId]) {
            mobileStates[escuelaId] = createMobileState();
        }

        // Reset quick stats
        updateQuickStats(escuelaId, []);
    }

    // ============================================
    // MOBILE STATE FACTORY
    // ============================================

    function createMobileState() {
        return {
            allItems: [],
            filteredItems: [],
            currentPage: 1,
            pageSize: 10,
            searchTerm: '',
            filterEstado: ''
        };
    }

    function getMobileState(escuelaId) {
        if (!mobileStates[escuelaId]) {
            mobileStates[escuelaId] = createMobileState();
        }
        return mobileStates[escuelaId];
    }

    // ============================================
    // QUICK STATS UPDATE
    // ============================================

    function updateQuickStats(escuelaId, estudiantes) {
        const total = estudiantes.length;
        const recogidos = estudiantes.filter(e => e.estado === 'recogido').length;
        const pendientes = estudiantes.filter(e => e.estado === 'pendiente').length;
        const noViaja = estudiantes.filter(e => e.estado === 'noViaja').length;

        // Desktop stats
        const statTotal = document.getElementById(`stat-total-${escuelaId}`);
        const statRecogidos = document.getElementById(`stat-recogidos-${escuelaId}`);
        const statPendientes = document.getElementById(`stat-pendientes-${escuelaId}`);
        const statNoViaja = document.getElementById(`stat-noviaja-${escuelaId}`);

        if (statTotal) statTotal.textContent = total;
        if (statRecogidos) statRecogidos.textContent = recogidos;
        if (statPendientes) statPendientes.textContent = pendientes;
        if (statNoViaja) statNoViaja.textContent = noViaja;

        // Mobile stats
        const statTotalMobile = document.getElementById(`stat-total-mobile-${escuelaId}`);
        const statRecogidosMobile = document.getElementById(`stat-recogidos-mobile-${escuelaId}`);
        const statPendientesMobile = document.getElementById(`stat-pendientes-mobile-${escuelaId}`);
        const statNoViajaMobile = document.getElementById(`stat-noviaja-mobile-${escuelaId}`);

        if (statTotalMobile) statTotalMobile.textContent = total;
        if (statRecogidosMobile) statRecogidosMobile.textContent = recogidos;
        if (statPendientesMobile) statPendientesMobile.textContent = pendientes;
        if (statNoViajaMobile) statNoViajaMobile.textContent = noViaja;

        // Update global stats
        updateGlobalStats();
    }

    function updateGlobalStats() {
        let totalRecogidos = 0;

        Object.keys(estudiantesData).forEach(escuelaId => {
            const estudiantes = estudiantesData[escuelaId] || [];
            totalRecogidos += estudiantes.filter(e => e.estado === 'recogido').length;
        });

        if (DOM.statsRecogidosHoy) {
            DOM.statsRecogidosHoy.textContent = totalRecogidos;
        }
    }

    // ============================================
    // ESTADO SELECT COLOR UPDATE
    // ============================================

    function updateEstadoSelectColor(select) {
        if (!select) return;

        select.classList.remove('estado-pendiente', 'estado-recogido', 'estado-noviaja');

        const value = select.value.toLowerCase();
        if (value === 'pendiente') {
            select.classList.add('estado-pendiente');
        } else if (value === 'recogido') {
            select.classList.add('estado-recogido');
        } else if (value === 'noviaja') {
            select.classList.add('estado-noviaja');
        }
    }

    // ============================================
    // DESKTOP TABLE RENDERING
    // ============================================

    function renderDesktopTable(escuelaId, estudiantes) {
        const tablaId = `tablaAsistencia-${escuelaId}`;
        const $tabla = $(`#${tablaId}`);
        const tbody = document.querySelector(`#${tablaId} tbody`);

        // Destroy existing DataTable
        if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
            $tabla.DataTable().clear().destroy();
        }

        if (!tbody) return;

        tbody.innerHTML = '';

        if (estudiantes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        No hay estudiantes asignados a esta buseta
                    </td>
                </tr>
            `;
        } else {
            estudiantes.forEach(e => {
                const tr = document.createElement('tr');
                tr.dataset.idEstudiante = e.idEstudiante;

                const estadoValue = e.estado || 'pendiente';

                tr.innerHTML = `
                    <td>${escapeHtml(e.nombre)}</td>
                    <td>${escapeHtml(e.apellidos)}</td>
                    <td>${escapeHtml(e.seccion || '—')}</td>
                    <td class="text-center">
                        <select class="tm-estado-select asistencia-estado-select estado-${estadoValue.toLowerCase()}"
                                data-estudiante-id="${e.idEstudiante}">
                            <option value="pendiente" ${estadoValue === 'pendiente' ? 'selected' : ''}>
                                ⏳ Pendiente
                            </option>
                            <option value="recogido" ${estadoValue === 'recogido' ? 'selected' : ''}>
                                ✅ Ya se recogió
                            </option>
                            <option value="noViaja" ${estadoValue === 'noViaja' ? 'selected' : ''}>
                                ❌ No viaja
                            </option>
                        </select>
                    </td>
                `;

                tbody.appendChild(tr);

                // Update select color
                const select = tr.querySelector('.tm-estado-select');
                updateEstadoSelectColor(select);
            });
        }

        // Initialize DataTable
        if (typeof initDataTable === 'function' && $.fn.DataTable && estudiantes.length > 0) {
            const tabla = initDataTable(tablaId, [3], {
                paging: true,
                searching: true,
                pageLength: 10,
                order: [[0, 'asc']]
            });

            setTimeout(() => {
                try {
                    tabla.columns.adjust();
                    if (tabla.responsive) {
                        tabla.responsive.recalc();
                    }
                } catch (err) {
                    console.warn('DataTable recalc warning:', err);
                }
            }, 10);
        }
    }

    // ============================================
    // MOBILE CARD RENDERING
    // ============================================

    function createEstudianteCardHtml(estudiante, escuelaId) {
        const estado = estudiante.estado || 'pendiente';
        const estadoClass = `estado-${estado.toLowerCase()}`;

        return `
            <div class="tm-estudiante-card ${estadoClass}" 
                 data-estudiante-id="${estudiante.idEstudiante}"
                 data-escuela-id="${escuelaId}">
                <div class="tm-estudiante-info">
                    <div class="tm-estudiante-nombre">
                        ${escapeHtml(estudiante.nombre)} ${escapeHtml(estudiante.apellidos)}
                    </div>
                    <div class="tm-estudiante-seccion">
                        <i class="bi bi-bookmark"></i>
                        ${escapeHtml(estudiante.seccion || 'Sin sección')}
                    </div>
                </div>
                <div class="tm-estudiante-actions">
                    <button type="button" 
                            class="tm-estado-btn btn-pendiente ${estado === 'pendiente' ? 'active' : ''}"
                            onclick="cambiarEstadoMobile(${estudiante.idEstudiante}, ${escuelaId}, 'pendiente')"
                            title="Pendiente">
                        <i class="bi bi-clock"></i>
                    </button>
                    <button type="button" 
                            class="tm-estado-btn btn-recogido ${estado === 'recogido' ? 'active' : ''}"
                            onclick="cambiarEstadoMobile(${estudiante.idEstudiante}, ${escuelaId}, 'recogido')"
                            title="Recogido">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button type="button" 
                            class="tm-estado-btn btn-noviaja ${estado === 'noViaja' ? 'active' : ''}"
                            onclick="cambiarEstadoMobile(${estudiante.idEstudiante}, ${escuelaId}, 'noViaja')"
                            title="No viaja">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function createMobileEmptyStateHtml(state) {
        const isFiltered = state.searchTerm || state.filterEstado;

        if (isFiltered) {
            return `
                <div class="tm-empty-state">
                    <i class="bi bi-search"></i>
                    <p>No se encontraron estudiantes</p>
                    <small>Intente con otros términos de búsqueda</small>
                </div>
            `;
        }

        return `
            <div class="tm-empty-state">
                <i class="bi bi-people"></i>
                <p>No hay estudiantes asignados</p>
                <small>No hay estudiantes asignados a esta buseta</small>
            </div>
        `;
    }

    function createMobilePaginationHtml(escuelaId, state) {
        const totalItems = state.filteredItems.length;
        const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
        const currentPage = state.currentPage;
        const pageSize = state.pageSize;

        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);

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
                        onclick="goToPageAsistencia(${escuelaId}, ${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalItems}</strong> estudiantes
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageAsistencia(${escuelaId}, ${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageAsistencia(${escuelaId}, ${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function filterMobileEstudiantes(escuelaId) {
        const state = getMobileState(escuelaId);
        const searchTerm = state.searchTerm.toLowerCase().trim();
        const filterEstado = state.filterEstado;

        state.filteredItems = state.allItems.filter(estudiante => {
            let matchesSearch = true;
            if (searchTerm) {
                const nombre = (estudiante.nombre || '').toLowerCase();
                const apellidos = (estudiante.apellidos || '').toLowerCase();
                const seccion = (estudiante.seccion || '').toLowerCase();

                matchesSearch = nombre.includes(searchTerm) ||
                    apellidos.includes(searchTerm) ||
                    seccion.includes(searchTerm);
            }

            let matchesStatus = true;
            if (filterEstado) {
                matchesStatus = estudiante.estado === filterEstado;
            }

            return matchesSearch && matchesStatus;
        });

        state.currentPage = 1;
    }

    function renderMobileCards(escuelaId) {
        const state = getMobileState(escuelaId);
        const container = document.getElementById(`estudianteCards-${escuelaId}`);
        const pagination = document.getElementById(`mobilePagination-${escuelaId}`);

        if (!container) return;

        // Get paged items
        const start = (state.currentPage - 1) * state.pageSize;
        const end = start + state.pageSize;
        const pagedItems = state.filteredItems.slice(start, end);

        if (pagedItems.length === 0) {
            container.innerHTML = createMobileEmptyStateHtml(state);
        } else {
            container.innerHTML = pagedItems
                .map(estudiante => createEstudianteCardHtml(estudiante, escuelaId))
                .join('');
        }

        // Update pagination
        if (pagination) {
            if (state.filteredItems.length > 0) {
                pagination.innerHTML = createMobilePaginationHtml(escuelaId, state);
                pagination.style.display = '';
            } else {
                pagination.innerHTML = '';
                pagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // MOBILE STATE CHANGE
    // ============================================

    function cambiarEstadoMobile(idEstudiante, escuelaId, nuevoEstado) {
        // Update data
        const estudiantes = estudiantesData[escuelaId] || [];
        const estudiante = estudiantes.find(e => e.idEstudiante === idEstudiante);

        if (estudiante) {
            estudiante.estado = nuevoEstado;
        }

        // Update mobile state
        const state = getMobileState(escuelaId);
        const mobileEstudiante = state.allItems.find(e => e.idEstudiante === idEstudiante);
        if (mobileEstudiante) {
            mobileEstudiante.estado = nuevoEstado;
        }

        // Update filtered items too
        const filteredEstudiante = state.filteredItems.find(e => e.idEstudiante === idEstudiante);
        if (filteredEstudiante) {
            filteredEstudiante.estado = nuevoEstado;
        }

        // Update UI
        const card = document.querySelector(`.tm-estudiante-card[data-estudiante-id="${idEstudiante}"][data-escuela-id="${escuelaId}"]`);
        if (card) {
            card.classList.remove('estado-pendiente', 'estado-recogido', 'estado-noviaja');
            card.classList.add(`estado-${nuevoEstado.toLowerCase()}`);

            // Update buttons
            card.querySelectorAll('.tm-estado-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            const activeBtn = card.querySelector(`.btn-${nuevoEstado.toLowerCase()}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }

            // Flash animation
            card.style.animation = 'none';
            card.offsetHeight; // Trigger reflow
            card.style.animation = 'rowFlash 0.5s ease-in-out';
        }

        // Update desktop table if visible
        const desktopSelect = document.querySelector(`#tablaAsistencia-${escuelaId} select[data-estudiante-id="${idEstudiante}"]`);
        if (desktopSelect) {
            desktopSelect.value = nuevoEstado;
            updateEstadoSelectColor(desktopSelect);
        }

        // Mark dirty and update stats
        marcarEscuelaDirty(escuelaId);
        updateQuickStats(escuelaId, estudiantes);
    }

    window.cambiarEstadoMobile = cambiarEstadoMobile;

    // ============================================
    // MOBILE PAGINATION
    // ============================================

    function goToPageAsistencia(escuelaId, page) {
        const state = getMobileState(escuelaId);
        const totalPages = Math.ceil(state.filteredItems.length / state.pageSize) || 1;

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        state.currentPage = page;
        renderMobileCards(escuelaId);

        const container = document.getElementById(`estudianteCards-${escuelaId}`);
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.goToPageAsistencia = goToPageAsistencia;

    // ============================================
    // LOAD STUDENTS
    // ============================================

    function cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje) {
        showLoading(true, 'Cargando estudiantes...');

        const tablaId = `tablaAsistencia-${escuelaId}`;
        const $tabla = $(`#${tablaId}`);

        // Destroy existing DataTable
        if ($.fn.DataTable && $.fn.DataTable.isDataTable($tabla)) {
            $tabla.DataTable().clear().destroy();
        }

        $.getJSON('/Asistencia/ObtenerEstudiantes', {
            institucionId: escuelaId,
            busetaId: busetaId
        })
            .done(function (respEstudiantes) {
                if (!respEstudiantes || respEstudiantes.ok !== true) {
                    showLoading(false);
                    const msg = respEstudiantes?.message || 'No se pudo cargar la lista de estudiantes.';
                    showNotification('error', 'Error', msg);
                    return;
                }

                const estudiantes = respEstudiantes.data || [];

                // Load saved states
                $.getJSON('/Asistencia/ObtenerEstados', {
                    institucionId: escuelaId,
                    busetaId: busetaId,
                    tipoViaje: tipoViaje
                })
                    .done(function (respEstados) {
                        const estadosGuardados = (respEstados?.ok === true) ? (respEstados.data || []) : [];

                        // Create estado map
                        const mapaEstados = {};
                        estadosGuardados.forEach(e => {
                            mapaEstados[e.idEstudiante ?? e.IdEstudiante] = (e.estado ?? e.Estado);
                        });

                        // Merge estado into estudiantes
                        const estudiantesConEstado = estudiantes.map(e => ({
                            ...e,
                            estado: (mapaEstados[e.idEstudiante] || 'pendiente').toLowerCase() === 'noviaja'
                                ? 'noViaja'
                                : (mapaEstados[e.idEstudiante] || 'pendiente')
                        }));

                        finalizarCargaEstudiantes(escuelaId, busetaId, tipoViaje, estudiantesConEstado);
                    })
                    .fail(function () {
                        // If loading states fails, use pendiente for all
                        const estudiantesConEstado = estudiantes.map(e => ({
                            ...e,
                            estado: 'pendiente'
                        }));

                        finalizarCargaEstudiantes(escuelaId, busetaId, tipoViaje, estudiantesConEstado);
                    });
            })
            .fail(function (jqXHR) {
                showLoading(false);
                const msg = jqXHR?.responseJSON?.message || 'Ocurrió un error al consultar los estudiantes.';
                showNotification('error', 'Error', msg);
            });
    }

    function finalizarCargaEstudiantes(escuelaId, busetaId, tipoViaje, estudiantes) {
        // Store data
        estudiantesData[escuelaId] = estudiantes;
        asistenciaBusetaActual[escuelaId] = busetaId;
        asistenciaTipoViajeActual[escuelaId] = tipoViaje;

        // Hide alert, show containers
        const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);
        const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);
        const contenedorMobile = document.getElementById(`mobile-container-${escuelaId}`);

        if (alerta) alerta.classList.add('d-none');

        // Render based on view
        if (isMobileView()) {
            if (contenedorMobile) contenedorMobile.classList.remove('d-none');
            if (contenedorTabla) contenedorTabla.classList.add('d-none');

            // Initialize mobile state
            const state = getMobileState(escuelaId);
            state.allItems = [...estudiantes];
            state.filteredItems = [...estudiantes];
            state.currentPage = 1;

            renderMobileCards(escuelaId);
        } else {
            if (contenedorTabla) contenedorTabla.classList.remove('d-none');
            if (contenedorMobile) contenedorMobile.classList.add('d-none');

            renderDesktopTable(escuelaId, estudiantes);
        }

        // Update stats
        updateQuickStats(escuelaId, estudiantes);
        marcarEscuelaClean(escuelaId);
        showLoading(false);
    }

    // ============================================
    // APPLY FILTERS
    // ============================================

    function aplicarFiltros(escuelaId) {
        const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
        const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);

        if (!busetaSelect) {
            showNotification('error', 'Error', 'No se pudo encontrar el selector de buseta.');
            return;
        }

        const busetaId = busetaSelect.value;

        if (!busetaId) {
            showNotification('warning', 'Buseta requerida', 'Debe seleccionar una buseta para ver la lista de estudiantes.');
            return;
        }

        if (!tipoViajeSelect) {
            showNotification('error', 'Error', 'No se encontró el selector de tipo de viaje.');
            return;
        }

        const tipoViaje = tipoViajeSelect.value;
        if (!tipoViaje) {
            showNotification('warning', 'Tipo de viaje requerido', 'Debe seleccionar un tipo de viaje antes de aplicar los filtros.');
            return;
        }

        const busetaActual = asistenciaBusetaActual[escuelaId] || null;
        const hayCambios = asistenciaDirtyState[escuelaId] === true;

        if (hayCambios && busetaActual) {
            const cambiandoBuseta = busetaActual !== busetaId;

            Swal.fire({
                icon: 'warning',
                title: 'Cambios sin guardar',
                text: cambiandoBuseta
                    ? 'Tienes cambios sin guardar. Si cambias de buseta se perderán. ¿Deseas continuar?'
                    : 'Tienes cambios sin guardar. Si recargas la lista se perderán. ¿Deseas continuar?',
                showCancelButton: true,
                confirmButtonColor: 'var(--tm-secondary)',
                cancelButtonColor: 'var(--tm-text-muted)',
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'No, mantener'
            }).then(result => {
                if (result.isConfirmed) {
                    marcarEscuelaClean(escuelaId);
                    cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje);
                } else if (cambiandoBuseta) {
                    busetaSelect.value = busetaActual;
                }
            });

            return;
        }

        cargarEstudiantesParaEscuela(escuelaId, busetaId, tipoViaje);
    }

    window.aplicarFiltros = aplicarFiltros;

    // ============================================
    // MARK ALL
    // ============================================

    function marcarTodos(escuelaId, estado) {
        const estudiantes = estudiantesData[escuelaId] || [];

        if (estudiantes.length === 0) {
            showNotification('warning', 'Sin estudiantes', 'No hay estudiantes para marcar.');
            return;
        }

        Swal.fire({
            icon: 'question',
            title: 'Confirmar acción',
            text: `¿Deseas marcar a todos los estudiantes como "${estado === 'recogido' ? 'Ya se recogió' : estado}"?`,
            showCancelButton: true,
            confirmButtonColor: 'var(--tm-secondary)',
            cancelButtonColor: 'var(--tm-text-muted)',
            confirmButtonText: 'Sí, marcar todos',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (!result.isConfirmed) return;

            // Update all estudiantes
            estudiantes.forEach(e => {
                e.estado = estado;
            });

            // Re-render
            if (isMobileView()) {
                const state = getMobileState(escuelaId);
                state.allItems = [...estudiantes];
                filterMobileEstudiantes(escuelaId);
                renderMobileCards(escuelaId);
            } else {
                renderDesktopTable(escuelaId, estudiantes);
            }

            marcarEscuelaDirty(escuelaId);
            updateQuickStats(escuelaId, estudiantes);

            showNotification('success', 'Actualizado', 'Todos los estudiantes han sido marcados.', true);
        });
    }

    window.marcarTodos = marcarTodos;

    // ============================================
    // SAVE ATTENDANCE
    // ============================================

    function guardarAsistencia(escuelaId) {
        const busetaSelect = document.getElementById(`buseta-${escuelaId}`);
        const tipoViajeSelect = document.getElementById(`tipoViaje-${escuelaId}`);

        if (!busetaSelect) {
            showNotification('error', 'Error', 'No se encontró el selector de buseta.');
            return;
        }

        const busetaId = busetaSelect.value;
        if (!busetaId) {
            showNotification('warning', 'Buseta requerida', 'Debe seleccionar una buseta antes de guardar.');
            return;
        }

        const tipoViaje = tipoViajeSelect?.value;
        if (!tipoViaje) {
            showNotification('warning', 'Tipo de viaje requerido', 'Debe seleccionar un tipo de viaje antes de guardar.');
            return;
        }

        const estudiantes = estudiantesData[escuelaId] || [];

        if (estudiantes.length === 0) {
            showNotification('warning', 'Sin estudiantes', 'No hay estudiantes para guardar asistencia.');
            return;
        }

        // Build detalles from stored data
        const detalles = estudiantes.map(e => ({
            idEstudiante: e.idEstudiante,
            estado: e.estado || 'pendiente',
            observaciones: null
        }));

        const payload = {
            idInstitucion: escuelaId,
            idBuseta: parseInt(busetaId, 10),
            tipoViaje: tipoViaje,
            detalles: detalles
        };

        Swal.fire({
            icon: 'question',
            title: 'Confirmar guardado',
            text: '¿Deseas guardar la asistencia actual para esta buseta?',
            showCancelButton: true,
            confirmButtonColor: 'var(--tm-primary)',
            cancelButtonColor: 'var(--tm-text-muted)',
            confirmButtonText: '<i class="bi bi-save me-1"></i>Sí, guardar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (!result.isConfirmed) return;

            showLoading(true, 'Guardando asistencia...');

            fetch('/Asistencia/GuardarAsistencia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
                .then(async resp => {
                    const data = await resp.json().catch(() => null);

                    if (!resp.ok || !data || data.ok !== true) {
                        showLoading(false);
                        const msg = data?.message || 'No se pudo guardar la asistencia.';
                        showNotification('error', 'Error', msg);
                        return;
                    }

                    showLoading(false);
                    marcarEscuelaClean(escuelaId);

                    Swal.fire({
                        icon: 'success',
                        title: 'Asistencia guardada',
                        text: 'La asistencia se guardó correctamente.',
                        confirmButtonColor: 'var(--tm-primary)',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        resetEscuelaUI(escuelaId);
                    });
                })
                .catch(() => {
                    showLoading(false);
                    showNotification('error', 'Error', 'Ocurrió un error al enviar la asistencia.');
                });
        });
    }

    window.guardarAsistencia = guardarAsistencia;

    // ============================================
    // MOBILE EVENT HANDLERS
    // ============================================

    function attachMobileEventHandlers(escuelaId) {
        const searchInput = document.getElementById(`mobileSearch-${escuelaId}`);
        const filterSelect = document.getElementById(`mobileFilterEstado-${escuelaId}`);

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const state = getMobileState(escuelaId);
                    state.searchTerm = e.target.value;
                    filterMobileEstudiantes(escuelaId);
                    renderMobileCards(escuelaId);
                }, 300);
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                const state = getMobileState(escuelaId);
                state.filterEstado = e.target.value;
                filterMobileEstudiantes(escuelaId);
                renderMobileCards(escuelaId);
            });
        }
    }

    // ============================================
    // DESKTOP EVENT HANDLERS
    // ============================================

    function attachDesktopEventHandlers() {
        document.body.addEventListener('change', (event) => {
            const select = event.target;
            if (!select.classList.contains('asistencia-estado-select')) return;

            const tr = select.closest('tr');
            if (!tr) return;

            // Update select color
            updateEstadoSelectColor(select);

            // Flash animation
            tr.classList.remove('asistencia-row-updated');
            void tr.offsetWidth;
            tr.classList.add('asistencia-row-updated');

            // Get escuelaId from table
            const tabla = tr.closest('table');
            if (tabla && tabla.id && tabla.id.startsWith('tablaAsistencia-')) {
                const escuelaId = parseInt(tabla.id.replace('tablaAsistencia-', ''), 10);
                if (!Number.isNaN(escuelaId)) {
                    // Update stored data
                    const idEstudiante = parseInt(select.dataset.estudianteId, 10);
                    const estudiantes = estudiantesData[escuelaId] || [];
                    const estudiante = estudiantes.find(e => e.idEstudiante === idEstudiante);

                    if (estudiante) {
                        estudiante.estado = select.value;
                    }

                    marcarEscuelaDirty(escuelaId);
                    updateQuickStats(escuelaId, estudiantes);
                }
            }
        });
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        Object.keys(estudiantesData).forEach(escuelaId => {
            const estudiantes = estudiantesData[escuelaId];
            if (!estudiantes || estudiantes.length === 0) return;

            const contenedorTabla = document.getElementById(`tabla-container-${escuelaId}`);
            const contenedorMobile = document.getElementById(`mobile-container-${escuelaId}`);
            const alerta = document.getElementById(`alerta-filtros-${escuelaId}`);

            // Only switch views if students are loaded
            if (alerta && !alerta.classList.contains('d-none')) return;

            if (isMobileView()) {
                if (contenedorMobile) contenedorMobile.classList.remove('d-none');
                if (contenedorTabla) contenedorTabla.classList.add('d-none');

                const state = getMobileState(escuelaId);
                state.allItems = [...estudiantes];
                state.filteredItems = [...estudiantes];
                renderMobileCards(escuelaId);
            } else {
                if (contenedorTabla) contenedorTabla.classList.remove('d-none');
                if (contenedorMobile) contenedorMobile.classList.add('d-none');

                renderDesktopTable(escuelaId, estudiantes);
            }
        });
    }, 250);

    // ============================================
    // BEFOREUNLOAD WARNING
    // ============================================

    function attachBeforeUnloadHandler() {
        window.addEventListener('beforeunload', function (e) {
            const hayCambios = Object.values(asistenciaDirtyState).some(v => v === true);
            if (!hayCambios) return;

            e.preventDefault();
            e.returnValue = '';
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function initPage() {
        // Cache DOM elements
        DOM.loadingOverlay = document.getElementById('loading-overlay');
        DOM.fechaActual = document.getElementById('fecha-actual');
        DOM.statsRecogidosHoy = document.getElementById('stats-recogidos-hoy');

        // Set current date
        if (DOM.fechaActual) {
            DOM.fechaActual.textContent = formatCurrentDate();
        }

        // Attach event handlers
        attachDesktopEventHandlers();
        attachBeforeUnloadHandler();

        // Attach mobile handlers for each institution
        document.querySelectorAll('.tm-asistencia-card').forEach(card => {
            const escuelaId = card.dataset.escuelaId;
            if (escuelaId) {
                attachMobileEventHandlers(parseInt(escuelaId, 10));
            }
        });

        // Handle window resize
        window.addEventListener('resize', handleResize);

        // Initialize accordion behavior - expand first by default on desktop
        if (!isMobileView()) {
            const firstAccordion = document.querySelector('.tm-accordion .collapse');
            if (firstAccordion) {
                const bsCollapse = new bootstrap.Collapse(firstAccordion, { toggle: false });
                // Optionally auto-expand first one
                // bsCollapse.show();
            }
        }
    }

    // ============================================
    // DOCUMENT READY
    // ============================================

    $(function () {
        initPage();
    });

})();