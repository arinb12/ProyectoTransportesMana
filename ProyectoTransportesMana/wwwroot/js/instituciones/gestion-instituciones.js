(function () {
    'use strict';

    // ============================================
    // CONFIGURATION & STATE
    // ============================================

    const CONFIG = {
        tableId: 'tablaInstituciones',
        modalId: 'modalInstitucion',
        formId: 'institucionForm',
        cardsContainerId: 'institucionCardsContainer',
        paginationId: 'mobilePaginationInstituciones',
        loadingOverlayId: 'loading-overlay',
        // Desktop config
        desktopCardsGridId: 'desktopCardsGrid',
        desktopCardsViewId: 'desktopCardsView',
        desktopTableViewId: 'desktopTableView',
        desktopEmptyStateId: 'desktopEmptyState',
        desktopPaginationId: 'desktopCardsPagination',
        desktopSearchId: 'desktopSearchInstituciones',
        desktopPageSizeId: 'desktopPageSize',
        desktopPageSizeContainerId: 'desktopPageSizeContainer',
        btnViewCardsId: 'btnViewCards',
        btnViewTableId: 'btnViewTable',
        nonSortableColumns: [1], // Acciones
        localStorageViewKey: 'instituciones_desktop_view',
        localStoragePageSizeKey: 'instituciones_desktop_pageSize'
    };

    // Mobile pagination state
    const mobileState = {
        allInstituciones: [],
        filteredInstituciones: [],
        currentPage: 1,
        pageSize: 10,
        searchTerm: ''
    };

    // Desktop state
    const desktopState = {
        allInstituciones: [],
        filteredInstituciones: [],
        currentPage: 1,
        pageSize: 12,
        searchTerm: '',
        currentView: 'cards' // 'cards' or 'table'
    };

    // DOM Elements (cached on init)
    const DOM = {
        modal: null,
        form: null,
        loadingOverlay: null,
        // Mobile
        institucionCardsContainer: null,
        mobileSearch: null,
        mobilePageSize: null,
        mobilePagination: null,
        // Desktop
        desktopCardsGrid: null,
        desktopCardsView: null,
        desktopTableView: null,
        desktopEmptyState: null,
        desktopPagination: null,
        desktopSearch: null,
        desktopPageSize: null,
        desktopPageSizeContainer: null,
        btnViewCards: null,
        btnViewTable: null
    };

    // DataTable instance
    let dataTable = null;

    // Anti-forgery token
    let antiToken = '';

    // Track page loaded state
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

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function () {
        init();
    });

    async function init() {
        // Cache DOM elements FIRST
        cacheDOMElements();

        // Show loading overlay immediately
        showLoading(true, 'Cargando instituciones...');

        try {
            // Load anti-forgery token
            await cargarToken();

            // Load data from JSON
            loadInstitucionesData();

            // Load saved preferences
            loadViewPreference();
            loadPageSizePreference();

            // Initialize components
            initDataTable();
            initDesktopEventHandlers();
            initMobileEventHandlers();
            initFormHandlers();
            initModalHandlers();
            initResizeHandler();

            // Initial render based on view
            if (isMobileView()) {
                renderMobileInstitucionCards();
            } else {
                renderDesktopView();
            }

            isPageLoaded = true;

        } catch (error) {
            console.error('Error initializing page:', error);
            showNotification('error', 'Error', 'No se pudieron cargar los datos iniciales');
        } finally {
            // Hide loading overlay after initialization
            showLoading(false);
        }
    }

    function cacheDOMElements() {
        // Common
        DOM.loadingOverlay = document.getElementById(CONFIG.loadingOverlayId);
        DOM.modal = document.getElementById(CONFIG.modalId);
        DOM.form = document.getElementById(CONFIG.formId);

        // Mobile
        DOM.institucionCardsContainer = document.getElementById(CONFIG.cardsContainerId);
        DOM.mobileSearch = document.getElementById('mobileSearchInstituciones');
        DOM.mobilePageSize = document.getElementById('mobilePageSize');
        DOM.mobilePagination = document.getElementById(CONFIG.paginationId);

        // Desktop
        DOM.desktopCardsGrid = document.getElementById(CONFIG.desktopCardsGridId);
        DOM.desktopCardsView = document.getElementById(CONFIG.desktopCardsViewId);
        DOM.desktopTableView = document.getElementById(CONFIG.desktopTableViewId);
        DOM.desktopEmptyState = document.getElementById(CONFIG.desktopEmptyStateId);
        DOM.desktopPagination = document.getElementById(CONFIG.desktopPaginationId);
        DOM.desktopSearch = document.getElementById(CONFIG.desktopSearchId);
        DOM.desktopPageSize = document.getElementById(CONFIG.desktopPageSizeId);
        DOM.desktopPageSizeContainer = document.getElementById(CONFIG.desktopPageSizeContainerId);
        DOM.btnViewCards = document.getElementById(CONFIG.btnViewCardsId);
        DOM.btnViewTable = document.getElementById(CONFIG.btnViewTableId);
    }

    // ============================================
    // TOKEN LOADING
    // ============================================

    async function cargarToken() {
        try {
            const urls = window.InstitucionesConfig?.urls;
            if (!urls?.token) {
                antiToken = GestionCommon.getAntiForgeryToken();
                return;
            }

            const resp = await fetch(urls.token);
            const data = await resp.json();
            antiToken = data.token;
        } catch (error) {
            console.error('Error loading token:', error);
            antiToken = GestionCommon.getAntiForgeryToken();
        }
    }

    // ============================================
    // DATA LOADING
    // ============================================

    function loadInstitucionesData() {
        const dataElement = document.getElementById('institucionesData');
        if (dataElement) {
            try {
                const data = JSON.parse(dataElement.textContent);
                // Mobile state
                mobileState.allInstituciones = data;
                mobileState.filteredInstituciones = [...data];
                // Desktop state
                desktopState.allInstituciones = data;
                desktopState.filteredInstituciones = [...data];
            } catch (e) {
                console.error('Error parsing instituciones data:', e);
                mobileState.allInstituciones = [];
                mobileState.filteredInstituciones = [];
                desktopState.allInstituciones = [];
                desktopState.filteredInstituciones = [];
            }
        }
    }

    // ============================================
    // VIEW PREFERENCE (localStorage)
    // ============================================

    function loadViewPreference() {
        try {
            const savedView = localStorage.getItem(CONFIG.localStorageViewKey);
            if (savedView === 'table' || savedView === 'cards') {
                desktopState.currentView = savedView;
            }
        } catch (e) {
            // localStorage not available
        }
    }

    function saveViewPreference(view) {
        try {
            localStorage.setItem(CONFIG.localStorageViewKey, view);
        } catch (e) {
            // localStorage not available
        }
    }

    function loadPageSizePreference() {
        try {
            const savedPageSize = localStorage.getItem(CONFIG.localStoragePageSizeKey);
            if (savedPageSize) {
                const size = parseInt(savedPageSize, 10);
                if ([6, 12, 24, 48].includes(size)) {
                    desktopState.pageSize = size;
                    // Update select if exists
                    if (DOM.desktopPageSize) {
                        DOM.desktopPageSize.value = size.toString();
                    }
                }
            }
        } catch (e) {
            // localStorage not available
        }
    }

    function savePageSizePreference(size) {
        try {
            localStorage.setItem(CONFIG.localStoragePageSizeKey, size.toString());
        } catch (e) {
            // localStorage not available
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
    // DESKTOP: VIEW TOGGLE
    // ============================================

    function initDesktopEventHandlers() {
        // View toggle buttons
        if (DOM.btnViewCards) {
            DOM.btnViewCards.addEventListener('click', () => switchDesktopView('cards'));
        }

        if (DOM.btnViewTable) {
            DOM.btnViewTable.addEventListener('click', () => switchDesktopView('table'));
        }

        // Desktop search with debounce
        if (DOM.desktopSearch) {
            let searchTimeout;
            DOM.desktopSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    desktopState.searchTerm = e.target.value;
                    filterDesktopInstituciones();
                    renderDesktopCards();

                    // Also filter DataTable if in table view
                    if (dataTable && desktopState.currentView === 'table') {
                        dataTable.search(e.target.value).draw();
                    }
                }, 300);
            });
        }

        // Desktop page size
        if (DOM.desktopPageSize) {
            DOM.desktopPageSize.addEventListener('change', (e) => {
                const newSize = parseInt(e.target.value, 10);
                desktopState.pageSize = newSize;
                desktopState.currentPage = 1;
                savePageSizePreference(newSize);
                renderDesktopCards();
            });
        }
    }

    function switchDesktopView(view) {
        desktopState.currentView = view;
        saveViewPreference(view);

        // Update toggle button states
        if (DOM.btnViewCards) {
            DOM.btnViewCards.classList.toggle('active', view === 'cards');
        }
        if (DOM.btnViewTable) {
            DOM.btnViewTable.classList.toggle('active', view === 'table');
        }

        // Show/hide views
        if (DOM.desktopCardsView) {
            DOM.desktopCardsView.style.display = view === 'cards' ? '' : 'none';
        }
        if (DOM.desktopTableView) {
            DOM.desktopTableView.style.display = view === 'table' ? '' : 'none';
        }

        // Show/hide page size selector (only for cards view)
        if (DOM.desktopPageSizeContainer) {
            DOM.desktopPageSizeContainer.style.display = view === 'cards' ? '' : 'none';
        }

        // Sync search term
        if (view === 'table' && dataTable) {
            dataTable.search(desktopState.searchTerm).draw();
            dataTable.columns.adjust().draw(false);
        }
    }

    function renderDesktopView() {
        // Set initial view state
        switchDesktopView(desktopState.currentView);
        // Render cards
        renderDesktopCards();
    }

    // ============================================
    // DESKTOP: FILTERING & PAGINATION
    // ============================================

    function filterDesktopInstituciones() {
        const searchTerm = desktopState.searchTerm.toLowerCase().trim();

        desktopState.filteredInstituciones = desktopState.allInstituciones.filter(institucion => {
            if (!searchTerm) return true;
            const nombre = (institucion.nombre || '').toLowerCase();
            return nombre.includes(searchTerm);
        });

        desktopState.currentPage = 1;
    }

    function getDesktopPagedInstituciones() {
        const start = (desktopState.currentPage - 1) * desktopState.pageSize;
        const end = start + desktopState.pageSize;
        return desktopState.filteredInstituciones.slice(start, end);
    }

    function getDesktopTotalPages() {
        return Math.ceil(desktopState.filteredInstituciones.length / desktopState.pageSize) || 1;
    }

    function goToDesktopPage(page) {
        const totalPages = getDesktopTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        desktopState.currentPage = page;
        renderDesktopCards();

        // Scroll to top of cards grid
        if (DOM.desktopCardsGrid) {
            DOM.desktopCardsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Global function for desktop pagination buttons
    window.goToDesktopPageInstituciones = goToDesktopPage;

    // ============================================
    // DESKTOP: CARD RENDERING
    // ============================================

    function createDesktopCardHtml(institucion) {
        const escapedNombre = escapeHtml(institucion.nombre).replace(/'/g, "\\'");
        return `
            <div class="tm-desktop-institucion-card" data-id="${institucion.idInstitucion}" data-nombre="${escapeHtml(institucion.nombre)}">
                <div class="tm-desktop-card-icon">
                    <i class="bi bi-building"></i>
                </div>
                <div class="tm-desktop-card-content">
                    <h3 class="tm-desktop-card-title">${escapeHtml(institucion.nombre)}</h3>
                </div>
                <div class="tm-desktop-card-actions">
                    <button class="tm-btn tm-btn-outline tm-btn-sm"
                            title="Editar"
                            onclick="editarInstitucion(${institucion.idInstitucion}, '${escapedNombre}')">
                        <i class="bi bi-pencil-fill"></i>
                        <span>Editar</span>
                    </button>
                    <button class="tm-btn tm-btn-danger tm-btn-sm"
                            title="Eliminar"
                            onclick="eliminarInstitucion(${institucion.idInstitucion}, '${escapedNombre}')">
                        <i class="bi bi-trash-fill"></i>
                        <span>Eliminar</span>
                    </button>
                </div>
            </div>
        `;
    }

    function createDesktopEmptyStateHtml() {
        if (desktopState.searchTerm) {
            return `
                <div class="tm-desktop-empty-state">
                    <i class="bi bi-search"></i>
                    <p>No se encontraron instituciones</p>
                    <small>Intente con otros términos de búsqueda</small>
                </div>
            `;
        }

        return `
            <div class="tm-desktop-empty-state">
                <i class="bi bi-building"></i>
                <p>No hay instituciones registradas</p>
                <small>Haga clic en "Nueva Institución" para agregar una</small>
            </div>
        `;
    }

    function createDesktopPaginationHtml() {
        const total = desktopState.filteredInstituciones.length;
        const totalPages = getDesktopTotalPages();
        const currentPage = desktopState.currentPage;
        const pageSize = desktopState.pageSize;

        const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, total);

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
                        class="tm-desktop-page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToDesktopPageInstituciones(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-desktop-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${total}</strong> instituciones
            </div>
            <div class="tm-desktop-pagination-controls">
                <button type="button" 
                        class="tm-desktop-page-btn" 
                        onclick="goToDesktopPageInstituciones(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-desktop-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-desktop-page-btn" 
                        onclick="goToDesktopPageInstituciones(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderDesktopCards() {
        if (!DOM.desktopCardsGrid) return;

        const pagedInstituciones = getDesktopPagedInstituciones();

        // Handle empty state
        if (DOM.desktopEmptyState) {
            if (desktopState.filteredInstituciones.length === 0) {
                DOM.desktopCardsGrid.innerHTML = '';
                DOM.desktopEmptyState.innerHTML = createDesktopEmptyStateHtml();
                DOM.desktopEmptyState.style.display = '';
            } else {
                DOM.desktopEmptyState.style.display = 'none';
                DOM.desktopCardsGrid.innerHTML = pagedInstituciones
                    .map(institucion => createDesktopCardHtml(institucion))
                    .join('');
            }
        } else {
            if (pagedInstituciones.length === 0) {
                DOM.desktopCardsGrid.innerHTML = createDesktopEmptyStateHtml();
            } else {
                DOM.desktopCardsGrid.innerHTML = pagedInstituciones
                    .map(institucion => createDesktopCardHtml(institucion))
                    .join('');
            }
        }

        // Render pagination
        if (DOM.desktopPagination) {
            if (desktopState.filteredInstituciones.length > desktopState.pageSize) {
                DOM.desktopPagination.innerHTML = createDesktopPaginationHtml();
                DOM.desktopPagination.style.display = '';
            } else if (desktopState.filteredInstituciones.length > 0) {
                // Show info but no pagination controls if only one page
                DOM.desktopPagination.innerHTML = `
                    <div class="tm-desktop-pagination-info">
                        Mostrando <strong>${desktopState.filteredInstituciones.length}</strong> instituciones
                    </div>
                `;
                DOM.desktopPagination.style.display = '';
            } else {
                DOM.desktopPagination.innerHTML = '';
                DOM.desktopPagination.style.display = 'none';
            }
        }
    }

    // ============================================
    // MOBILE: FILTERING & PAGINATION
    // ============================================

    function filterInstituciones() {
        const searchTerm = mobileState.searchTerm.toLowerCase().trim();

        mobileState.filteredInstituciones = mobileState.allInstituciones.filter(institucion => {
            if (!searchTerm) return true;

            const nombre = (institucion.nombre || '').toLowerCase();
            return nombre.includes(searchTerm);
        });

        mobileState.currentPage = 1;
    }

    function getPagedInstituciones() {
        const start = (mobileState.currentPage - 1) * mobileState.pageSize;
        const end = start + mobileState.pageSize;
        return mobileState.filteredInstituciones.slice(start, end);
    }

    function getTotalPages() {
        return Math.ceil(mobileState.filteredInstituciones.length / mobileState.pageSize) || 1;
    }

    function goToPage(page) {
        const totalPages = getTotalPages();
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        mobileState.currentPage = page;
        renderMobileInstitucionCards();

        if (DOM.institucionCardsContainer) {
            DOM.institucionCardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Global function for pagination buttons
    window.goToPageInstituciones = goToPage;

    // ============================================
    // MOBILE: CARD RENDERING
    // ============================================

    function createInstitucionCardHtml(institucion) {
        return `
            <div class="tm-institucion-card" data-id="${institucion.idInstitucion}">
                <div class="tm-institucion-card-header">
                    <div class="tm-institucion-info">
                        <div class="tm-institucion-icon">
                            <i class="bi bi-building"></i>
                        </div>
                        <span class="tm-institucion-name">${escapeHtml(institucion.nombre)}</span>
                    </div>
                    <div class="tm-institucion-actions">
                        <button class="tm-btn tm-btn-sm tm-btn-outline" 
                                onclick="editarInstitucion(${institucion.idInstitucion}, '${escapeHtml(institucion.nombre).replace(/'/g, "\\'")}')"
                                title="Editar">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="tm-btn tm-btn-sm tm-btn-danger" 
                                onclick="eliminarInstitucion(${institucion.idInstitucion}, '${escapeHtml(institucion.nombre).replace(/'/g, "\\'")}')"
                                title="Eliminar">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function createEmptyStateHtml() {
        const isFiltered = mobileState.searchTerm;

        if (isFiltered) {
            return `
                <div class="tm-empty-state">
                    <i class="bi bi-search"></i>
                    <p>No se encontraron instituciones</p>
                    <small>Intente con otros términos de búsqueda</small>
                </div>
            `;
        }

        return `
            <div class="tm-empty-state">
                <i class="bi bi-building"></i>
                <p>No hay instituciones registradas</p>
                <small>Haga clic en "Nueva Institución" para agregar una</small>
            </div>
        `;
    }

    function createPaginationHtml() {
        const totalInstituciones = mobileState.filteredInstituciones.length;
        const totalPages = getTotalPages();
        const currentPage = mobileState.currentPage;
        const pageSize = mobileState.pageSize;

        const startItem = totalInstituciones === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalInstituciones);

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
                        onclick="goToPageInstituciones(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalInstituciones}</strong> instituciones
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="goToPageInstituciones(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="goToPageInstituciones(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderMobileInstitucionCards() {
        if (!DOM.institucionCardsContainer) return;

        const pagedInstituciones = getPagedInstituciones();

        if (pagedInstituciones.length === 0) {
            DOM.institucionCardsContainer.innerHTML = createEmptyStateHtml();
        } else {
            DOM.institucionCardsContainer.innerHTML = pagedInstituciones
                .map(institucion => createInstitucionCardHtml(institucion))
                .join('');
        }

        // Render pagination
        if (DOM.mobilePagination) {
            if (mobileState.filteredInstituciones.length > 0) {
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
                    filterInstituciones();
                    renderMobileInstitucionCards();
                }, 300);
            });
        }

        // Page size
        if (DOM.mobilePageSize) {
            DOM.mobilePageSize.addEventListener('change', (e) => {
                mobileState.pageSize = parseInt(e.target.value, 10);
                mobileState.currentPage = 1;
                renderMobileInstitucionCards();
            });
        }
    }

    // ============================================
    // FORM HANDLERS
    // ============================================

    function initFormHandlers() {
        if (!DOM.form) return;

        DOM.form.addEventListener('submit', handleFormSubmit);
    }

    function initModalHandlers() {
        if (!DOM.modal) return;

        DOM.modal.addEventListener('shown.bs.modal', function () {
            document.getElementById('Nombre')?.focus();
        });

        DOM.modal.addEventListener('hidden.bs.modal', function () {
            nuevaInstitucion();
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const id = document.getElementById('IdInstitucion').value;
        const nombre = document.getElementById('Nombre').value.trim();

        if (!nombre) {
            showNotification('warning', 'Campo requerido', 'Por favor ingrese el nombre de la institución');
            return;
        }

        const esEdicion = id && parseInt(id) > 0;

        const titulo = esEdicion ? 'Confirmar cambios' : 'Confirmar registro';
        const texto = esEdicion
            ? '¿Desea guardar los cambios de la institución?'
            : '¿Desea registrar esta nueva institución?';

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

    async function submitForm(esEdicion) {
        const urls = window.InstitucionesConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        const url = esEdicion ? urls.actualizar : urls.crear;

        const payload = {
            IdInstitucion: document.getElementById('IdInstitucion').value || 0,
            Nombre: document.getElementById('Nombre').value.trim()
        };

        showLoading(true, esEdicion ? 'Actualizando...' : 'Registrando...');

        try {
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'RequestVerificationToken': antiToken
                },
                body: JSON.stringify(payload)
            });

            showLoading(false);

            if (resp.ok) {
                Swal.fire({
                    icon: 'success',
                    title: esEdicion ? 'Actualizado' : 'Registrado',
                    text: esEdicion
                        ? 'La institución fue actualizada correctamente.'
                        : 'La institución fue registrada correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });

                setTimeout(() => {
                    $('#' + CONFIG.modalId).modal('hide');
                    location.reload();
                }, 1600);
            } else {
                const errorData = await resp.json().catch(() => null);
                showNotification('error', 'Error', errorData?.message || 'No se pudo guardar la institución');
            }
        } catch (error) {
            showLoading(false);
            console.error('Error saving institucion:', error);
            showNotification('error', 'Error', 'No se pudo guardar la institución');
        }
    }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    function nuevaInstitucion() {
        if (DOM.form) {
            DOM.form.reset();
            DOM.form.classList.remove('was-validated');
        }

        document.getElementById('IdInstitucion').value = '0';
        document.getElementById('Nombre').value = '';

        // Update modal title
        const modalLabel = document.getElementById('modalInstitucionLabel');
        if (modalLabel) {
            modalLabel.innerHTML = '<i class="bi bi-building-add me-2"></i>Nueva Institución';
        }
    }

    window.nuevaInstitucion = nuevaInstitucion;

    window.editarInstitucion = function (id, nombre) {
        document.getElementById('IdInstitucion').value = id;
        document.getElementById('Nombre').value = nombre;

        // Update modal title
        const modalLabel = document.getElementById('modalInstitucionLabel');
        if (modalLabel) {
            modalLabel.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Institución';
        }

        // Clear validation
        if (DOM.form) DOM.form.classList.remove('was-validated');

        // Show modal
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(CONFIG.modalId));
        modal.show();
    };

    window.eliminarInstitucion = function (id, nombre) {
        GestionCommon.showDeleteConfirmation({
            title: '¿Eliminar institución?',
            html: `Se eliminará la institución: <strong>${escapeHtml(nombre)}</strong><br><small class="text-muted">Esta acción no se puede deshacer.</small>`,
            confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm: function () {
                performDelete(id);
            }
        });
    };

    async function performDelete(id) {
        const urls = window.InstitucionesConfig?.urls;
        if (!urls) {
            showNotification('error', 'Error', 'Configuración de URLs no encontrada');
            return;
        }

        showLoading(true, 'Eliminando...');

        try {
            const resp = await fetch(`${urls.eliminar}?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'RequestVerificationToken': antiToken
                }
            });

            showLoading(false);

            const data = await resp.json().catch(() => ({ success: resp.ok }));

            if (data.success || resp.ok) {
                showNotification('success', 'Eliminada', data.message || 'La institución fue eliminada correctamente.', true);
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('error', 'Error', data.message || 'No se pudo eliminar la institución');
            }
        } catch (error) {
            showLoading(false);
            console.error('Error deleting institucion:', error);
            showNotification('error', 'Error', 'No se pudo eliminar la institución');
        }
    }

    // ============================================
    // RESIZE HANDLER
    // ============================================

    function initResizeHandler() {
        const handler = GestionCommon.createResizeHandler(() => {
            if (isPageLoaded) {
                if (isMobileView()) {
                    renderMobileInstitucionCards();
                } else {
                    renderDesktopView();
                    if (dataTable && desktopState.currentView === 'table') {
                        dataTable.columns.adjust().draw(false);
                    }
                }
            }
        }, 250);

        window.addEventListener('resize', handler);
    }

})();