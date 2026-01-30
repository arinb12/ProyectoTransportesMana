/**
 * Gestión Common - Shared JavaScript Module
 * Contains common functionality for management pages (estudiantes, maestras, Usuarios, Instituciones, etc.)
 * 
 * Usage:
 * 1. Include this file before your page-specific JS
 * 2. Use GestionCommon namespace to access shared functions
 */

const GestionCommon = (function () {
    'use strict';

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Show or hide a loading overlay
     * @param {HTMLElement} overlayElement - The loading overlay element
     * @param {boolean} show - Whether to show or hide
     * @param {string|null} message - Optional message to display
     */
    function showLoading(overlayElement, show = true, message = null) {
        if (overlayElement) {
            overlayElement.style.display = show ? 'flex' : 'none';
            if (message) {
                const messageEl = overlayElement.querySelector('p');
                if (messageEl) {
                    messageEl.textContent = message;
                }
            }
        }
    }

    /**
     * Show notification using SweetAlert2
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {string} title - Notification title
     * @param {string} text - Notification text
     * @param {boolean} toast - Whether to show as toast
     */
    function showNotification(type, title, text, toast = false) {
        if (typeof SwalNotify === 'function' && !toast) {
            SwalNotify(type, title, text);
            return;
        }

        if (typeof Swal !== 'undefined') {
            if (toast) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: type,
                    title: title,
                    text: text,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            } else {
                Swal.fire({ icon: type, title: title, text: text });
            }
        } else {
            alert(`${title}\n${text}`);
        }
    }

    /**
     * Check if current viewport is mobile
     * @param {number} breakpoint - Breakpoint in pixels (default 992)
     * @returns {boolean}
     */
    function isMobileView(breakpoint = 992) {
        return window.innerWidth < breakpoint;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string}
     */
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Escape string for use in HTML attributes
     * @param {string} str - String to escape
     * @returns {string}
     */
    function escapeAttr(str) {
        if (str == null) return '';
        return String(str)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Get anti-forgery token from the page
     * @returns {string}
     */
    function getAntiForgeryToken() {
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
        return tokenInput ? tokenInput.value : '';
    }

    // ============================================
    // MOBILE PAGINATION STATE FACTORY
    // ============================================

    /**
     * Create a new mobile pagination state object
     * @returns {Object}
     */
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

    // ============================================
    // MOBILE PAGINATION UTILITIES
    // ============================================

    /**
     * Get paginated items for current page
     * @param {Object} state - Mobile state object
     * @returns {Array}
     */
    function getPagedItems(state) {
        const start = (state.currentPage - 1) * state.pageSize;
        const end = start + state.pageSize;
        return state.filteredItems.slice(start, end);
    }

    /**
     * Get total pages
     * @param {Object} state - Mobile state object
     * @returns {number}
     */
    function getTotalPages(state) {
        return Math.ceil(state.filteredItems.length / state.pageSize) || 1;
    }

    /**
     * Go to specific page
     * @param {Object} state - Mobile state object
     * @param {number} page - Page number
     * @param {Function} renderCallback - Function to call after page change
     * @param {HTMLElement} scrollTarget - Element to scroll to after page change
     */
    function goToPage(state, page, renderCallback, scrollTarget = null) {
        const totalPages = getTotalPages(state);
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        state.currentPage = page;

        if (typeof renderCallback === 'function') {
            renderCallback();
        }

        if (scrollTarget) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Create pagination HTML
     * @param {Object} state - Mobile state object
     * @param {string} itemLabel - Label for items (e.g., "estudiantes", "maestras")
     * @param {string} goToPageFunctionName - Name of the global goToPage function
     * @returns {string}
     */
    function createPaginationHtml(state, itemLabel, goToPageFunctionName) {
        const totalItems = state.filteredItems.length;
        const totalPages = getTotalPages(state);
        const currentPage = state.currentPage;
        const pageSize = state.pageSize;

        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);

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
                        onclick="${goToPageFunctionName}(${i})">
                    ${i}
                </button>
            `;
        }

        return `
            <div class="tm-pagination-info">
                Mostrando <strong>${startItem}-${endItem}</strong> de <strong>${totalItems}</strong> ${itemLabel}
            </div>
            <div class="tm-pagination-controls">
                <button type="button" 
                        class="tm-page-btn tm-page-prev" 
                        onclick="${goToPageFunctionName}(${currentPage - 1})"
                        ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="tm-page-numbers">
                    ${pageNumbers}
                </div>
                <button type="button" 
                        class="tm-page-btn tm-page-next" 
                        onclick="${goToPageFunctionName}(${currentPage + 1})"
                        ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        `;
    }

    /**
     * Create empty state HTML
     * @param {Object} state - Mobile state object
     * @param {Object} options - Configuration options
     * @param {string} options.iconFiltered - Icon class when filtered (default: 'bi-search')
     * @param {string} options.iconEmpty - Icon class when empty (default: 'bi-inbox')
     * @param {string} options.messageFiltered - Message when filtered
     * @param {string} options.messageEmpty - Message when empty
     * @param {string} options.submessageFiltered - Submessage when filtered
     * @param {string} options.submessageEmpty - Submessage when empty
     * @returns {string}
     */
    function createEmptyStateHtml(state, options = {}) {
        const isFiltered = state.searchTerm || state.filterEstado;

        const defaults = {
            iconFiltered: 'bi-search',
            iconEmpty: 'bi-inbox',
            messageFiltered: 'No se encontraron resultados',
            messageEmpty: 'No hay registros',
            submessageFiltered: 'Intente con otros términos de búsqueda',
            submessageEmpty: 'Haga clic en el botón para agregar uno nuevo'
        };

        const config = { ...defaults, ...options };

        if (isFiltered) {
            return `
                <div class="tm-empty-state">
                    <i class="bi ${config.iconFiltered}"></i>
                    <p>${config.messageFiltered}</p>
                    <small>${config.submessageFiltered}</small>
                </div>
            `;
        }

        return `
            <div class="tm-empty-state">
                <i class="bi ${config.iconEmpty}"></i>
                <p>${config.messageEmpty}</p>
                <small>${config.submessageEmpty}</small>
            </div>
        `;
    }

    // ============================================
    // MOBILE CONTROL HANDLERS
    // ============================================

    /**
     * Attach common mobile control event handlers
     * @param {Object} config - Configuration object
     * @param {HTMLElement} config.searchInput - Search input element
     * @param {HTMLElement} config.filterSelect - Filter select element
     * @param {HTMLElement} config.pageSizeSelect - Page size select element
     * @param {Object} config.state - Mobile state object
     * @param {Function} config.filterFunction - Function to filter items
     * @param {Function} config.renderFunction - Function to render items
     * @param {number} config.debounceDelay - Debounce delay in ms (default: 300)
     */
    function attachMobileControlHandlers(config) {
        const {
            searchInput,
            filterSelect,
            pageSizeSelect,
            state,
            filterFunction,
            renderFunction,
            debounceDelay = 300
        } = config;

        // Search input with debounce
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    state.searchTerm = e.target.value;
                    if (typeof filterFunction === 'function') {
                        filterFunction();
                    }
                    if (typeof renderFunction === 'function') {
                        renderFunction();
                    }
                }, debounceDelay);
            });
        }

        // Status filter
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                state.filterEstado = e.target.value;
                if (typeof filterFunction === 'function') {
                    filterFunction();
                }
                if (typeof renderFunction === 'function') {
                    renderFunction();
                }
            });
        }

        // Page size
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                state.pageSize = parseInt(e.target.value, 10);
                state.currentPage = 1;
                if (typeof renderFunction === 'function') {
                    renderFunction();
                }
            });
        }
    }

    // ============================================
    // SELECT2 INITIALIZATION
    // ============================================

    /**
     * Initialize Select2 on an element
     * @param {jQuery} $el - jQuery element
     * @param {jQuery|HTMLElement} dropdownParent - Parent for dropdown
     */
    function initSelect2($el, dropdownParent = null) {
        if (!$el || !$el.length || !$.fn.select2) return;

        const options = {
            placeholder: $el.data('placeholder') || 'Seleccione una opción',
            allowClear: true,
            width: '100%',
            language: {
                noResults: () => 'No se encontraron resultados',
                searching: () => 'Buscando...'
            }
        };

        if (dropdownParent) {
            options.dropdownParent = dropdownParent;
        }

        $el.select2(options).on('change.select2', function () {
            $(this).trigger('input');
            const $form = $(this).closest('form');
            if ($form.length && $form.data('validator')) {
                $(this).valid();
            }
        });
    }

    /**
     * Initialize Select2 multiple on an element
     * @param {jQuery} $el - jQuery element
     * @param {jQuery|HTMLElement} dropdownParent - Parent for dropdown
     */
    function initSelect2Multiple($el, dropdownParent = null) {
        if (!$el || !$el.length || !$.fn.select2) return;

        const options = {
            placeholder: $el.data('placeholder') || 'Seleccione una o más opciones',
            allowClear: true,
            width: '100%',
            closeOnSelect: false,
            language: {
                noResults: () => 'No se encontraron resultados',
                searching: () => 'Buscando...'
            }
        };

        if (dropdownParent) {
            options.dropdownParent = dropdownParent;
        }

        $el.select2(options);
    }

    // ============================================
    // DATATABLE INITIALIZATION
    // ============================================

    /**
     * Initialize DataTable with common options
     * @param {string} tableId - Table element ID
     * @param {Array} nonSortableColumns - Array of column indexes to disable sorting
     * @param {Object} additionalOptions - Additional DataTable options
     * @returns {DataTable|null}
     */
    function initDataTableInstance(tableId, nonSortableColumns = [], additionalOptions = {}) {
        if (typeof initDataTable === 'function') {
            return initDataTable(tableId, nonSortableColumns, {
                order: [[0, 'asc']],
                pageLength: 10,
                ...additionalOptions
            });
        }
        return null;
    }

    // ============================================
    // RESIZE HANDLER FACTORY
    // ============================================

    /**
     * Create a debounced resize handler
     * @param {Function} callback - Function to call on resize
     * @param {number} delay - Debounce delay in ms (default: 250)
     * @returns {Function}
     */
    function createResizeHandler(callback, delay = 250) {
        let resizeTimeout;
        return function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (typeof callback === 'function') {
                    callback();
                }
            }, delay);
        };
    }

    // ============================================
    // STATUS BADGE HTML
    // ============================================

    /**
     * Create status badge HTML
     * @param {boolean} isActive - Whether the item is active
     * @param {Object} labels - Custom labels { active: string, inactive: string }
     * @returns {string}
     */
    function createStatusBadgeHtml(isActive, labels = { active: 'Activo', inactive: 'Inactivo' }) {
        if (isActive) {
            return `<span class="tm-badge tm-badge-success"><i class="bi bi-check-circle-fill"></i> ${labels.active}</span>`;
        }
        return `<span class="tm-badge tm-badge-danger"><i class="bi bi-x-circle-fill"></i> ${labels.inactive}</span>`;
    }

    /**
     * Update status badge in a card element
     * @param {HTMLElement} card - Card element
     * @param {boolean} isActive - Whether the item is active
     * @param {Object} labels - Custom labels { active: string, inactive: string }
     */
    function updateCardStatusBadge(card, isActive, labels = { active: 'Activo', inactive: 'Inactivo' }) {
        if (!card) return;

        card.classList.toggle('active', isActive);
        card.classList.toggle('inactive', !isActive);

        const badge = card.querySelector('.tm-badge');
        if (badge) {
            if (isActive) {
                badge.className = 'tm-badge tm-badge-success';
                badge.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${labels.active}`;
            } else {
                badge.className = 'tm-badge tm-badge-danger';
                badge.innerHTML = `<i class="bi bi-x-circle-fill"></i> ${labels.inactive}`;
            }
        }
    }

    // ============================================
    // DELETE CONFIRMATION
    // ============================================

    /**
     * Show delete confirmation dialog
     * @param {Object} options - Configuration options
     * @param {string} options.title - Dialog title
     * @param {string} options.html - Dialog HTML content
     * @param {string} options.confirmButtonText - Confirm button text
     * @param {Function} options.onConfirm - Callback when confirmed
     */
    function showDeleteConfirmation(options) {
        const {
            title = '¿Estás seguro?',
            html = 'Esta acción no se puede deshacer.',
            confirmButtonText = '<i class="bi bi-trash me-1"></i>Sí, eliminar',
            onConfirm
        } = options;

        if (typeof Swal === 'undefined') {
            if (confirm(`${title}\n${html.replace(/<[^>]*>/g, '')}`)) {
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            }
            return;
        }

        Swal.fire({
            title: title,
            html: html,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            confirmButtonText: confirmButtonText,
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed && typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Utilities
        showLoading,
        showNotification,
        isMobileView,
        escapeHtml,
        escapeAttr,
        getAntiForgeryToken,

        // Mobile state
        createMobileState,

        // Pagination
        getPagedItems,
        getTotalPages,
        goToPage,
        createPaginationHtml,
        createEmptyStateHtml,

        // Mobile controls
        attachMobileControlHandlers,

        // Select2
        initSelect2,
        initSelect2Multiple,

        // DataTable
        initDataTableInstance,

        // Resize handler
        createResizeHandler,

        // Status
        createStatusBadgeHtml,
        updateCardStatusBadge,

        // Delete confirmation
        showDeleteConfirmation
    };

})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GestionCommon;
}