(function () {
    'use strict';

    // ============================================
    // MODULE STATE
    // ============================================
    let dataTableInstance = null;
    let isPageLoaded = false;
    let ultimoData = [];

    // Mobile pagination state
    const mobileState = {
        allRecords: [],
        filteredRecords: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: '',
        filterEstado: ''
    };

    // DOM Elements (cached on init)
    const DOM = {
        loadingOverlay: null,
        // Filters
        filtroFecha: null,
        filtroEscuela: null,
        filtroBuseta: null,
        filtroTipo: null,
        btnAplicar: null,
        btnLimpiar: null,
        btnExportar: null,
        // Stats
        cardTotal: null,
        cardRecogidos: null,
        cardNoViaja: null,
        cardPendientes: null,
        desktopResultCount: null,
        // Mobile elements
        historialCardsContainer: null,
        mobileSearch: null,
        mobileFilterEstado: null,
        mobilePageSize: null,
        mobilePagination: null
    };

    // Status configuration
    const STATUS_CONFIG = {
        recogido: { label: 'Recogido', class: 'tm-status-recogido', icon: 'bi-check-circle-fill' },
        noviaja: { label: 'No Viaja', class: 'tm-status-noviaja', icon: 'bi-x-circle-fill' },
        pendiente: { label: 'Pendiente', class: 'tm-status-pendiente', icon: 'bi-hourglass-split' }
    };

    // Viaje type configuration
    const VIAJE_CONFIG = {
        'ida-manana': { label: 'Ida Mañana', class: 'tm-viaje-ida', icon: 'bi-sunrise' },
        'ida-tarde': { label: 'Ida Tarde', class: 'tm-viaje-ida', icon: 'bi-sun' },
        'vuelta-manana': { label: 'Vuelta Mañana', class: 'tm-viaje-vuelta', icon: 'bi-sunrise' },
        'vuelta-tarde': { label: 'Vuelta Tarde', class: 'tm-viaje-vuelta', icon: 'bi-sunset' }
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
    // HELPER FUNCTIONS
    // ============================================

    function pick(obj, camel, pascal) {
        return (obj && obj[camel] !== undefined) ? obj[camel] : (obj ? obj[pascal] : undefined);
    }

    function isoDateOnly(v) {
        if (!v) return '';
        return v.toString().substring(0, 10);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function getStatusConfig(estado) {
        const normalized = (estado ?? '').toString().toLowerCase().replace(/\s+/g, '');
        return STATUS_CONFIG[normalized] || STATUS_CONFIG.pendiente;
    }

    function getViajeConfig(tipoViaje) {
        const normalized = (tipoViaje ?? '').toString().toLowerCase();
        return VIAJE_CONFIG[normalized] || { label: tipoViaje || '—', class: '', icon: 'bi-signpost-split' };
    }

    function getStatusBadgeHtml(estado) {
        const config = getStatusConfig(estado);
        return `<span class="tm-status-badge ${config.class}">
                    <i class="bi ${config.icon}"></i>
                    ${config.label}
                </span>`;
    }

    function getViajeBadgeHtml(tipoViaje) {
        const config = getViajeConfig(tipoViaje);
        return `<span class="tm-viaje-badge ${config.class}">
                    <i class="bi ${config.icon}"></i>
                    ${config.label}
                </span>`;
    }

    // ============================================
    // FILTER FUNCTIONS
    // ============================================

    function leerFiltros() {
        return {
            fecha: DOM.filtroFecha?.value || '',
            institucionId: DOM.filtroEscuela?.value ? parseInt(DOM.filtroEscuela.value, 10) : null,
            busetaId: DOM.filtroBuseta?.value ? parseInt(DOM.filtroBuseta.value, 10) : null,
            tipoViaje: DOM.filtroTipo?.value?.trim() || null
        };
    }

    function limpiarFiltros() {
        const hoy = new Date().toISOString().split('T')[0];
        if (DOM.filtroFecha) DOM.filtroFecha.value = hoy;
        if (DOM.filtroEscuela) DOM.filtroEscuela.value = '';
        if (DOM.filtroBuseta) DOM.filtroBuseta.value = '';
        if (DOM.filtroTipo) DOM.filtroTipo.value = '';

        // Reset mobile filters too
        if (DOM.mobileSearch) DOM.mobileSearch.value = '';
        if (DOM.mobileFilterEstado) DOM.mobileFilterEstado.value = '';

        mobileState.searchTerm = '';
        mobileState.filterEstado = '';

        aplicarFiltros();
    }

    async function aplicarFiltros() {
        const f = leerFiltros();

        if (!f.fecha) {
            showNotification('warning', 'Fecha requerida', 'Debe seleccionar una fecha para consultar el historial.');
            return;
        }

        showLoading(true, 'Cargando historial...');

        const params = new URLSearchParams();
        params.set('fecha', f.fecha);

        if (f.institucionId) params.set('institucionId', f.institucionId.toString());
        if (f.busetaId) params.set('busetaId', f.busetaId.toString());
        if (f.tipoViaje) params.set('tipoViaje', f.tipoViaje);

        try {
            const response = await fetch(`/Asistencia/BuscarHistorial?${params.toString()}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error:', response.status, errorText);
                showNotification('error', 'Error', 'No se pudo cargar el historial.');
                showLoading(false);
                return;
            }

            const json = await response.json();

            // Handle different response formats
            // Format 1: { ok: true, data: [...] }
            // Format 2: Direct array [...]
            let data = [];

            if (Array.isArray(json)) {
                data = json;
            } else if (json && json.ok === true && Array.isArray(json.data)) {
                data = json.data;
            } else if (json && Array.isArray(json.data)) {
                data = json.data;
            } else if (json && json.ok === false) {
                showNotification('error', 'Error', json.message || 'No se pudo cargar el historial.');
                showLoading(false);
                return;
            }

            ultimoData = data;

            // Update stats
            actualizarResumen(ultimoData);

            // Update result count
            updateResultCount(ultimoData.length);

            // Store data for mobile
            mobileState.allRecords = ultimoData;
            mobileState.filteredRecords = [...mobileState.allRecords];
            mobileState.currentPage = 1;

            // Apply mobile filters if any
            filterMobileRecords();

            // Render based on view
            if (isMobileView()) {
                renderMobileHistorialCards();
            } else {
                renderDesktopTable(ultimoData);
            }

            isPageLoaded = true;
        } catch (error) {
            console.error('Error loading historial:', error);
            showNotification('error', 'Error', 'Ocurrió un error al consultar el historial.');
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // STATS UPDATE
    // ============================================

    function actualizarResumen(rows) {
        const estadoNorm = (x) => ((pick(x, 'estado', 'Estado') ?? '').toString().toLowerCase().replace(/\s+/g, ''));

        const total = rows.length;
        const recogidos = rows.filter(x => estadoNorm(x) === 'recogido').length;
        const noViaja = rows.filter(x => estadoNorm(x) === 'noviaja').length;
        const pendientes = rows.filter(x => estadoNorm(x) === 'pendiente').length;

        if (DOM.cardTotal) DOM.cardTotal.textContent = total;
        if (DOM.cardRecogidos) DOM.cardRecogidos.textContent = recogidos;
        if (DOM.cardNoViaja) DOM.cardNoViaja.textContent = noViaja;
        if (DOM.cardPendientes) DOM.cardPendientes.textContent = pendientes;
    }

    function updateResultCount(count) {
        const text = count === 1 ? '1 registro' : `${count} registros`;
        if (DOM.desktopResultCount) {
            DOM.desktopResultCount.textContent = text;
        }
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

        const tbody = document.getElementById('tbodyHistorial');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            // For empty state, don't initialize DataTable - just show message
            const table = document.getElementById('tablaHistorial');
            if (table) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-muted py-4">
                            <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                            No se encontraron registros para la fecha seleccionada
                        </td>
                    </tr>
                `;
            }
            return;
        }

        data.forEach(r => {
            const tr = document.createElement('tr');

            const fecha = pick(r, 'fecha', 'Fecha');
            const escuela = pick(r, 'escuela', 'Escuela');
            const placaBuseta = pick(r, 'placaBuseta', 'PlacaBuseta');
            const nombreConductor = pick(r, 'nombreConductor', 'NombreConductor');
            const tipoViaje = pick(r, 'tipoViaje', 'TipoViaje');
            const nombre = pick(r, 'nombre', 'Nombre');
            const apellidos = pick(r, 'apellidos', 'Apellidos');
            const seccion = pick(r, 'seccion', 'Seccion');
            const estado = pick(r, 'estado', 'Estado');

            const busetaTxt = placaBuseta
                ? `${placaBuseta}${nombreConductor ? ' - ' + nombreConductor : ''}`
                : '—';

            tr.innerHTML = `
                <td>${formatDate(fecha)}</td>
                <td>${escapeHtml(escuela || '—')}</td>
                <td>${escapeHtml(busetaTxt)}</td>
                <td>${getViajeBadgeHtml(tipoViaje)}</td>
                <td>${escapeHtml(nombre || '—')}</td>
                <td>${escapeHtml(apellidos || '—')}</td>
                <td>${escapeHtml(seccion || '—')}</td>
                <td class="text-center">${getStatusBadgeHtml(estado)}</td>
            `;

            tbody.appendChild(tr);
        });

        initDataTableInstance();
    }

    function initDataTableInstance() {
        // Only initialize if there's data in the table
        const tbody = document.getElementById('tbodyHistorial');
        if (!tbody || tbody.children.length === 0) return;

        // Check if first row is the empty state row (has colspan)
        const firstRow = tbody.querySelector('tr');
        if (firstRow && firstRow.querySelector('td[colspan]')) return;

        dataTableInstance = initDataTable('tablaHistorial', [3, 7], {
            order: [[0, 'desc']],
            pageLength: 10
        });
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterMobileRecords() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();
        const filterEstado = mobileState.filterEstado;

        mobileState.filteredRecords = mobileState.allRecords.filter(record => {
            // Search filter
            let matchesSearch = true;
            if (searchTerm) {
                const nombre = (pick(record, 'nombre', 'Nombre') || '').toLowerCase();
                const apellidos = (pick(record, 'apellidos', 'Apellidos') || '').toLowerCase();
                const escuela = (pick(record, 'escuela', 'Escuela') || '').toLowerCase();
                const seccion = (pick(record, 'seccion', 'Seccion') || '').toLowerCase();

                matchesSearch = nombre.includes(searchTerm) ||
                    apellidos.includes(searchTerm) ||
                    escuela.includes(searchTerm) ||
                    seccion.includes(searchTerm);
            }

            // Status filter
            let matchesStatus = true;
            if (filterEstado) {
                const estado = (pick(record, 'estado', 'Estado') || '').toLowerCase().replace(/\s+/g, '');
                matchesStatus = estado === filterEstado;
            }

            return matchesSearch && matchesStatus;
        });

        mobileState.currentPage = 1;
    }

    function getPagedRecords() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredRecords.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredRecords.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileHistorialCards();

        if (DOM.historialCardsContainer) {
            DOM.historialCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    window.goToPageHistorial = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createHistorialCardHtml(record) {
        const fecha = pick(record, 'fecha', 'Fecha');
        const escuela = pick(record, 'escuela', 'Escuela');
        const placaBuseta = pick(record, 'placaBuseta', 'PlacaBuseta');
        const nombreConductor = pick(record, 'nombreConductor', 'NombreConductor');
        const tipoViaje = pick(record, 'tipoViaje', 'TipoViaje');
        const nombre = pick(record, 'nombre', 'Nombre');
        const apellidos = pick(record, 'apellidos', 'Apellidos');
        const seccion = pick(record, 'seccion', 'Seccion');
        const estado = pick(record, 'estado', 'Estado');

        const estadoNorm = (estado || '').toLowerCase().replace(/\s+/g, '');
        const viajeConfig = getViajeConfig(tipoViaje);

        const busetaTxt = placaBuseta
            ? `${placaBuseta}${nombreConductor ? ' - ' + nombreConductor : ''}`
            : '—';

        const cardId = `historial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return `
            <div class="tm-historial-card status-${estadoNorm}">
                <div class="tm-historial-card-header" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#${cardId}" 
                     aria-expanded="false"
                     aria-controls="${cardId}">
                    <div class="tm-historial-info">
                        <div class="tm-historial-title-row">
                            <span class="tm-historial-name">${escapeHtml(nombre || '')} ${escapeHtml(apellidos || '')}</span>
                            ${getStatusBadgeHtml(estado)}
                        </div>
                        <div class="tm-historial-meta">
                            <span class="tm-historial-meta-item">
                                <i class="bi bi-calendar3"></i>
                                ${formatDate(fecha)}
                            </span>
                            <span class="tm-historial-meta-item">
                                <i class="bi bi-building"></i>
                                ${escapeHtml(escuela || '—')}
                            </span>
                            <span class="tm-historial-meta-item">
                                <i class="bi ${viajeConfig.icon}"></i>
                                ${viajeConfig.label}
                            </span>
                        </div>
                    </div>
                    <div class="tm-historial-preview">
                        <i class="bi bi-chevron-down tm-expand-icon"></i>
                    </div>
                </div>
                <div class="collapse" id="${cardId}">
                    <div class="tm-historial-card-body">
                        <div class="tm-historial-details">
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Nombre Completo</span>
                                <span class="tm-historial-detail-value">${escapeHtml(nombre || '')} ${escapeHtml(apellidos || '')}</span>
                            </div>
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Sección</span>
                                <span class="tm-historial-detail-value">${escapeHtml(seccion || '—')}</span>
                            </div>
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Escuela</span>
                                <span class="tm-historial-detail-value">${escapeHtml(escuela || '—')}</span>
                            </div>
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Buseta</span>
                                <span class="tm-historial-detail-value">${escapeHtml(busetaTxt)}</span>
                            </div>
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Tipo de Viaje</span>
                                <span class="tm-historial-detail-value">${getViajeBadgeHtml(tipoViaje)}</span>
                            </div>
                            <div class="tm-historial-detail-item">
                                <span class="tm-historial-detail-label">Estado</span>
                                <span class="tm-historial-detail-value">${getStatusBadgeHtml(estado)}</span>
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
            iconEmpty: 'bi-clock-history',
            messageFiltered: 'No se encontraron registros',
            messageEmpty: 'No hay registros de asistencia',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Seleccione una fecha y aplique los filtros'
        });
    }

    function createPaginationHtml() {
        const totalRecords = mobileState.filteredRecords.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalRecords);

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
                        onclick="goToPageHistorial(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalRecords}</strong> registros
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageHistorial(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageHistorial(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileHistorialCards() {
        if (!DOM.historialCardsContainer) return;

        const pagedRecords = getPagedRecords();

        if (pagedRecords.length === 0) {
            DOM.historialCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.historialCardsContainer.innerHTML = pagedRecords
                .map(record => createHistorialCardHtml(record))
                .join('');
        }

        if (DOM.mobilePagination) {
            if (mobileState.filteredRecords.length > 0) {
                DOM.mobilePagination.innerHTML = createPaginationHtml();
                DOM.mobilePagination.style.display = '';
            } else {
                DOM.mobilePagination.innerHTML = '';
                DOM.mobilePagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // CSV EXPORT
    // ============================================

    function csvCell(v) {
        const s = (v ?? '').toString().replace(/"/g, '""');
        return `"${s}"`;
    }

    function exportarCSV() {
        if (!ultimoData || ultimoData.length === 0) {
            showNotification('info', 'Sin datos', 'No hay datos para exportar.');
            return;
        }

        let csv = 'Fecha,Escuela,Buseta,TipoViaje,Nombre,Apellidos,Seccion,Estado\n';

        ultimoData.forEach(r => {
            const fecha = isoDateOnly(pick(r, 'fecha', 'Fecha'));
            const escuela = pick(r, 'escuela', 'Escuela') ?? '';
            const placaBuseta = pick(r, 'placaBuseta', 'PlacaBuseta');
            const nombreConductor = pick(r, 'nombreConductor', 'NombreConductor');
            const tipoViaje = pick(r, 'tipoViaje', 'TipoViaje') ?? '';
            const nombre = pick(r, 'nombre', 'Nombre') ?? '';
            const apellidos = pick(r, 'apellidos', 'Apellidos') ?? '';
            const seccion = pick(r, 'seccion', 'Seccion') ?? '';
            const estado = pick(r, 'estado', 'Estado') ?? '';

            const busetaTxt = placaBuseta
                ? `${placaBuseta} - ${nombreConductor ?? ''}`.trim()
                : '';

            csv += [
                csvCell(fecha),
                csvCell(escuela),
                csvCell(busetaTxt),
                csvCell(tipoViaje),
                csvCell(nombre),
                csvCell(apellidos),
                csvCell(seccion),
                csvCell(estado)
            ].join(',') + '\n';
        });

        // Add BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;

        // Generate filename with date
        const filtroFecha = DOM.filtroFecha?.value || new Date().toISOString().split('T')[0];
        a.download = `historial-asistencia-${filtroFecha}.csv`;
        a.click();

        URL.revokeObjectURL(url);

        showNotification('success', 'Exportado', 'El archivo CSV se ha descargado correctamente.', true);
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
                    filterMobileRecords();
                    renderMobileHistorialCards();
                }, 300);
            });
        }

        if (DOM.mobileFilterEstado) {
            DOM.mobileFilterEstado.addEventListener('change', (e) => {
                mobileState.filterEstado = e.target.value;
                filterMobileRecords();
                renderMobileHistorialCards();
            });
        }

        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileHistorialCards();
            });
        }
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    const handleResize = GestionCommon.createResizeHandler(() => {
        if (isPageLoaded) {
            if (isMobileView()) {
                renderMobileHistorialCards();
            } else {
                renderDesktopTable(ultimoData);
            }
        }
    }, 250);

    // ============================================
    // INITIALIZATION
    // ============================================

    function cacheDOMElements() {
        DOM.loadingOverlay = document.getElementById('loading-overlay');

        // Filters
        DOM.filtroFecha = document.getElementById('filtroFecha');
        DOM.filtroEscuela = document.getElementById('filtroEscuela');
        DOM.filtroBuseta = document.getElementById('filtroBuseta');
        DOM.filtroTipo = document.getElementById('filtroTipo');
        DOM.btnAplicar = document.getElementById('btnAplicar');
        DOM.btnLimpiar = document.getElementById('btnLimpiar');
        DOM.btnExportar = document.getElementById('btnExportar');

        // Stats
        DOM.cardTotal = document.getElementById('cardTotal');
        DOM.cardRecogidos = document.getElementById('cardRecogidos');
        DOM.cardNoViaja = document.getElementById('cardNoViaja');
        DOM.cardPendientes = document.getElementById('cardPendientes');
        DOM.desktopResultCount = document.getElementById('desktopResultCount');

        // Mobile elements
        DOM.historialCardsContainer = document.getElementById('historialCardsContainer');
        DOM.mobileSearch = document.getElementById('mobileSearchHistorial');
        DOM.mobileFilterEstado = document.getElementById('mobileFilterEstado');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById('mobilePaginationHistorial');
    }

    function attachEventListeners() {
        // Filter buttons
        if (DOM.btnAplicar) {
            DOM.btnAplicar.addEventListener('click', aplicarFiltros);
        }

        if (DOM.btnLimpiar) {
            DOM.btnLimpiar.addEventListener('click', limpiarFiltros);
        }

        if (DOM.btnExportar) {
            DOM.btnExportar.addEventListener('click', exportarCSV);
        }

        // Enter key on date input
        if (DOM.filtroFecha) {
            DOM.filtroFecha.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    aplicarFiltros();
                }
            });
        }

        // Attach mobile event handlers
        attachMobileEventHandlers();

        // Handle window resize
        window.addEventListener('resize', handleResize);
    }

    function initPage() {
        // Cache DOM elements
        cacheDOMElements();

        // Set today's date as default
        const hoy = new Date().toISOString().split('T')[0];
        if (DOM.filtroFecha) {
            DOM.filtroFecha.value = hoy;
        }

        // Attach event listeners
        attachEventListeners();

        // Load initial data
        aplicarFiltros();
    }

    // ============================================
    // DOCUMENT READY
    // ============================================

    document.addEventListener('DOMContentLoaded', initPage);

})();