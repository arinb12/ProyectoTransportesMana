// Data maps for lookups
const encargadosMap = new Map();
const busetasMap = new Map();
let alertaIdToDelete = null;
let dataTableInstance = null;

// Mobile view state
let allAlertasData = [];
let filteredAlertas = [];
let mobileCurrentPage = 1;
let mobilePageSize = 10;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show or hide the loading overlay
 * @param {boolean} show - Whether to show the overlay
 */
function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Toggle visibility of public destination groups based on selection
 */
function togglePublicoGroups() {
    const publico = document.getElementById('publico')?.value;
    const grupoBuseta = document.getElementById('grupoBuseta');
    const grupoEncargado = document.getElementById('grupoEncargado');

    if (grupoBuseta) {
        grupoBuseta.classList.toggle('d-none', publico !== 'buseta');
    }
    if (grupoEncargado) {
        grupoEncargado.classList.toggle('d-none', publico !== 'encargado');
    }
}

/**
 * Check if the "Leido" value indicates the alert has been read
 * Handles multiple formats: boolean, number, and Spanish strings
 * @param {*} leidoValue - The raw "Leido" value from the API
 * @returns {boolean} True if the alert has been read
 */
function isAlertaLeida(leidoValue) {
    if (leidoValue === null || leidoValue === undefined) return false;

    // Handle boolean
    if (leidoValue === true) return true;
    if (leidoValue === false) return false;

    // Handle number
    if (leidoValue === 1) return true;
    if (leidoValue === 0) return false;

    // Handle string values
    if (typeof leidoValue === 'string') {
        const normalized = leidoValue
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return normalized === 'si' ||
            normalized === 'yes' ||
            normalized === 'true' ||
            normalized === '1';
    }

    return false;
}

/**
 * Show a success or error notification using SweetAlert2
 * @param {string} type - 'success' or 'error'
 * @param {string} title - Notification title
 * @param {string} text - Notification message
 */
function showNotification(type, title, text) {
    if (typeof SwalNotify === 'function') {
        SwalNotify(type, title, text, true);
    } else if (typeof Swal !== 'undefined' && Swal.fire) {
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
        alert(`${title}\n${text}`);
    }
}

// ============================================
// STATS FUNCTIONS
// ============================================

/**
 * Update statistics cards with alert counts
 * @param {Array} alertas - Array of alert objects
 */
function updateStats(alertas) {
    const total = alertas.length;
    const leidas = alertas.filter(a => {
        const leido = a.Leido ?? a.leido;
        return isAlertaLeida(leido);
    }).length;
    const pendientes = total - leidas;

    const totalEl = document.getElementById('stats-total-alertas');
    const leidasEl = document.getElementById('stats-alertas-leidas');
    const pendientesEl = document.getElementById('stats-alertas-pendientes');

    if (totalEl) totalEl.textContent = total;
    if (leidasEl) leidasEl.textContent = leidas;
    if (pendientesEl) pendientesEl.textContent = pendientes;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Mark all alerts as read for the current user
 * @returns {boolean} True if successful, false otherwise
 */
async function marcarAlertasComoLeidas() {
    if (!window.CURRENT_USER_ID || window.CURRENT_USER_ID === 0) return false;

    try {
        const resp = await fetch(`${window.API_BASE}/api/alerta/user/${window.CURRENT_USER_ID}/marcar-leidas`, {
            method: 'POST'
        });
        return resp.ok;
    } catch (error) {
        console.error('Error marking alerts as read:', error);
        return false;
    }
}

/**
 * Load lookup data (busetas and encargados) for dropdowns
 */
async function cargarLookups() {
    try {
        const [busRes, encRes] = await Promise.all([
            fetch(`${window.API_BASE}/api/alerta/busetas`),
            fetch(`${window.API_BASE}/api/alerta/encargados`)
        ]);

        if (busRes.ok) {
            const data = await busRes.json();
            const sel = document.getElementById('buseta');
            if (sel) {
                data.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.Id;
                    opt.textContent = b.Texto;
                    sel.appendChild(opt);
                    busetasMap.set(String(b.Id), b.Texto);
                });
            }
        }

        if (encRes.ok) {
            const data = await encRes.json();
            const sel = document.getElementById('encargado');
            if (sel) {
                data.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e.IdUsuario;
                    opt.textContent = e.NombreCompleto;
                    sel.appendChild(opt);
                    encargadosMap.set(String(opt.value), opt.textContent);
                });
            }
        }
    } catch (error) {
        console.error('Error loading lookups:', error);
    }
}

// ============================================
// BADGE/FORMATTING FUNCTIONS
// ============================================

/**
 * Parse public destination and return formatted badge HTML
 * @param {string} publicoRaw - Raw public destination value
 * @returns {string} HTML badge string
 */
function parsePublicoDestino(publicoRaw) {
    let publicoTexto = publicoRaw ?? '';

    for (let [key, value] of busetasMap.entries()) {
        if (publicoTexto === `buseta:${key}`) {
            return `<span class="tm-badge tm-badge-info">Buseta: ${escapeHtml(value)}</span>`;
        }
    }

    if (String(publicoTexto).startsWith('usuario:')) {
        const id = String(publicoTexto).split(':')[1];
        const nombre = encargadosMap.get(id) || 'Desconocido';
        return `<span class="tm-badge tm-badge-secondary">Encargado: ${escapeHtml(nombre)}</span>`;
    }

    if (publicoTexto === 'todos') {
        return '<span class="tm-badge tm-badge-primary">Todos</span>';
    }

    return escapeHtml(publicoTexto);
}

/**
 * Parse public destination and return plain text
 * @param {string} publicoRaw - Raw public destination value
 * @returns {string} Plain text string
 */
function parsePublicoDestinoText(publicoRaw) {
    let publicoTexto = publicoRaw ?? '';

    for (let [key, value] of busetasMap.entries()) {
        if (publicoTexto === `buseta:${key}`) {
            return `Buseta: ${value}`;
        }
    }

    if (String(publicoTexto).startsWith('usuario:')) {
        const id = String(publicoTexto).split(':')[1];
        const nombre = encargadosMap.get(id) || 'Desconocido';
        return `Encargado: ${nombre}`;
    }

    if (publicoTexto === 'todos') {
        return 'Todos';
    }

    return publicoTexto;
}

/**
 * Get badge HTML for alert type
 * @param {string} tipo - Alert type
 * @returns {string} HTML badge string
 */
function getTipoBadge(tipo) {
    const tipoLower = (tipo ?? '').toLowerCase();
    let badgeClass = 'tm-badge-secondary';

    if (tipoLower.includes('retraso')) badgeClass = 'tm-badge-warning';
    else if (tipoLower.includes('cambio')) badgeClass = 'tm-badge-info';
    else if (tipoLower.includes('evento') || tipoLower.includes('especial')) badgeClass = 'tm-badge-success';

    return `<span class="tm-badge ${badgeClass}">${escapeHtml(tipo)}</span>`;
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

/**
 * Filter alerts based on user role
 * @param {Array} allAlertas - All alerts from API
 * @returns {Array} Filtered alerts
 */
function filtrarAlertasPorRol(allAlertas) {
    const rolActual = Number(window.ROL_ACTUAL);
    const userId = Number(window.CURRENT_USER_ID);

    if (rolActual === 1 || rolActual === 5) {
        return allAlertas;
    } else if (rolActual === 2) {
        return allAlertas.filter(a => {
            const destino = a.publico_destino ?? a.PublicoDestino ?? '';
            return destino === 'todos' || destino === `usuario:${userId}`;
        });
    } else {
        return allAlertas.filter(a => {
            const destino = a.publico_destino ?? a.PublicoDestino ?? '';
            return destino === 'todos';
        });
    }
}

/**
 * Transform alert data for DataTable
 * @param {Array} alertasFiltradas - Filtered alerts
 * @returns {Array} Transformed data for DataTable
 */
function transformarDatosTabla(alertasFiltradas) {
    return alertasFiltradas.map(r => {
        const id = r.id_alerta ?? r.Id_Alerta ?? r.IdAlerta ?? '';
        const titulo = r.titulo ?? r.Titulo ?? '';
        const mensaje = r.mensaje ?? r.Mensaje ?? '';
        const fecha = r.fecha_publicacion || r.Fecha_Publicacion || r.FechaPublicacion;
        const publicoRaw = r.publico_destino ?? r.PublicoDestino ?? '';
        const tipo = r.tipo_alerta ?? r.TipoAlerta ?? '';
        const leidoRaw = r.Leido ?? r.leido;
        const leidoFlag = isAlertaLeida(leidoRaw);

        return {
            id: id,
            titulo: escapeHtml(titulo),
            mensaje: escapeHtml(mensaje.length > 50 ? mensaje.substring(0, 50) + '...' : mensaje),
            fecha: fecha ? new Date(fecha).toLocaleDateString('es-CR', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '',
            publico: parsePublicoDestino(publicoRaw),
            estado: leidoFlag
                ? '<span class="tm-badge tm-badge-success"><i class="bi bi-check-circle me-1"></i>Leído</span>'
                : '<span class="tm-badge tm-badge-danger"><i class="bi bi-envelope me-1"></i>Pendiente</span>',
            tipo: getTipoBadge(tipo),
            acciones: `
                <div class="tm-action-buttons">
                    <button class="tm-btn tm-btn-sm tm-btn-ghost tm-text-danger"
                            onclick="confirmarEliminar(${id})"
                            title="Eliminar alerta"
                            aria-label="Eliminar alerta ${id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `
        };
    });
}

// ============================================
// MOBILE VIEW FUNCTIONS
// ============================================

/**
 * Render a single alert card for mobile view
 * @param {Object} alerta - Alert data object
 * @param {number} index - Index for unique IDs
 * @returns {string} HTML string for the card
 */
function renderAlertCard(alerta, index) {
    const id = alerta.id_alerta ?? alerta.Id_Alerta ?? alerta.IdAlerta ?? '';
    const titulo = alerta.titulo ?? alerta.Titulo ?? '';
    const mensaje = alerta.mensaje ?? alerta.Mensaje ?? '';
    const fecha = alerta.fecha_publicacion || alerta.Fecha_Publicacion || alerta.FechaPublicacion;
    const publicoRaw = alerta.publico_destino ?? alerta.PublicoDestino ?? '';
    const tipo = alerta.tipo_alerta ?? alerta.TipoAlerta ?? '';
    const leidoRaw = alerta.Leido ?? alerta.leido;
    const leidoFlag = isAlertaLeida(leidoRaw);

    const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString('es-CR', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    const estadoBadge = leidoFlag
        ? '<span class="tm-badge tm-badge-success"><i class="bi bi-check-circle me-1"></i>Leído</span>'
        : '<span class="tm-badge tm-badge-danger"><i class="bi bi-envelope me-1"></i>Pendiente</span>';

    const cardClass = leidoFlag ? 'read' : 'unread';
    const collapseId = `alertCollapse${index}`;

    return `
        <div class="tm-alert-card ${cardClass}" data-alert-id="${id}">
            <div class="tm-alert-card-header" 
                 data-bs-toggle="collapse" 
                 data-bs-target="#${collapseId}" 
                 aria-expanded="false" 
                 aria-controls="${collapseId}">
                <div class="tm-alert-info">
                    <div class="tm-alert-title-row">
                        <span class="tm-alert-title">${escapeHtml(titulo)}</span>
                        <span class="tm-alert-type">${getTipoBadge(tipo)}</span>
                    </div>
                    <div class="tm-alert-meta">
                        <span class="tm-alert-meta-item">
                            <i class="bi bi-calendar3"></i>
                            ${fechaFormateada}
                        </span>
                        <span class="tm-alert-meta-item">
                            <i class="bi bi-people"></i>
                            ${escapeHtml(parsePublicoDestinoText(publicoRaw))}
                        </span>
                    </div>
                </div>
                <div class="tm-alert-preview">
                    <div class="tm-alert-status">
                        ${estadoBadge}
                    </div>
                    <i class="bi bi-chevron-down tm-expand-icon"></i>
                </div>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="tm-alert-card-body">
                    <div class="tm-alert-message">
                        ${escapeHtml(mensaje) || '<em class="text-muted">Sin mensaje</em>'}
                    </div>
                    <div class="tm-alert-details">
                        <div class="tm-alert-detail-item">
                            <span class="tm-alert-detail-label">ID</span>
                            <span class="tm-alert-detail-value">#${id}</span>
                        </div>
                        <div class="tm-alert-detail-item">
                            <span class="tm-alert-detail-label">Tipo</span>
                            <span class="tm-alert-detail-value">${escapeHtml(tipo)}</span>
                        </div>
                        <div class="tm-alert-detail-item">
                            <span class="tm-alert-detail-label">Destinatario</span>
                            <span class="tm-alert-detail-value">${escapeHtml(parsePublicoDestinoText(publicoRaw))}</span>
                        </div>
                        <div class="tm-alert-detail-item">
                            <span class="tm-alert-detail-label">Estado</span>
                            <span class="tm-alert-detail-value">${leidoFlag ? 'Leído' : 'Pendiente'}</span>
                        </div>
                    </div>
                    <div class="tm-alert-actions">
                        <button class="tm-btn tm-btn-sm tm-btn-danger" onclick="confirmarEliminar(${id})">
                            <i class="bi bi-trash me-1"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Apply filters and search to alerts for mobile view
 */
function applyMobileFilters() {
    const searchTerm = document.getElementById('mobileSearchAlertas')?.value.toLowerCase() || '';
    const estadoFilter = document.getElementById('mobileFilterEstado')?.value || '';

    filteredAlertas = allAlertasData.filter(alerta => {
        // Search filter
        const titulo = (alerta.titulo ?? alerta.Titulo ?? '').toLowerCase();
        const mensaje = (alerta.mensaje ?? alerta.Mensaje ?? '').toLowerCase();
        const tipo = (alerta.tipo_alerta ?? alerta.TipoAlerta ?? '').toLowerCase();
        const matchesSearch = !searchTerm ||
            titulo.includes(searchTerm) ||
            mensaje.includes(searchTerm) ||
            tipo.includes(searchTerm);

        // Status filter
        const leidoRaw = alerta.Leido ?? alerta.leido;
        const isLeida = isAlertaLeida(leidoRaw);
        let matchesEstado = true;
        if (estadoFilter === 'pendiente') {
            matchesEstado = !isLeida;
        } else if (estadoFilter === 'leido') {
            matchesEstado = isLeida;
        }

        return matchesSearch && matchesEstado;
    });

    // Reset to first page when filters change
    mobileCurrentPage = 1;
    renderMobileAlerts();
}

/**
 * Render mobile alert cards with pagination
 */
function renderMobileAlerts() {
    const container = document.getElementById('alertCardsContainer');
    if (!container) return;

    const totalItems = filteredAlertas.length;
    const totalPages = Math.ceil(totalItems / mobilePageSize);
    const startIndex = (mobileCurrentPage - 1) * mobilePageSize;
    const endIndex = Math.min(startIndex + mobilePageSize, totalItems);
    const pageItems = filteredAlertas.slice(startIndex, endIndex);

    // Render cards or empty state
    if (pageItems.length === 0) {
        container.innerHTML = `
            <div class="tm-empty-state-alerts">
                <i class="bi bi-bell-slash"></i>
                <p>No se encontraron alertas</p>
                <small>Intente ajustar los filtros de búsqueda</small>
            </div>
        `;
    } else {
        container.innerHTML = pageItems.map((alerta, idx) =>
            renderAlertCard(alerta, startIndex + idx)
        ).join('');
    }

    // Update pagination
    updateMobilePagination(totalItems, totalPages, startIndex, endIndex);
}

/**
 * Update mobile pagination controls
 */
function updateMobilePagination(totalItems, totalPages, startIndex, endIndex) {
    // Update info text
    const infoEl = document.querySelector('.tm-pagination-info');
    if (infoEl) {
        if (totalItems === 0) {
            infoEl.innerHTML = `Mostrando <strong>0</strong> alertas`;
        } else {
            infoEl.innerHTML = `Mostrando <strong>${startIndex + 1}-${endIndex}</strong> de <strong>${totalItems}</strong> alertas`;
        }
    }

    // Update prev/next buttons
    const prevBtn = document.querySelector('.tm-page-prev');
    const nextBtn = document.querySelector('.tm-page-next');

    if (prevBtn) {
        prevBtn.disabled = mobileCurrentPage <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = mobileCurrentPage >= totalPages;
    }

    // Render page numbers
    const pageNumbersContainer = document.querySelector('.tm-page-numbers');
    if (pageNumbersContainer) {
        let pageNumbersHtml = '';

        // Determine which page numbers to show
        let startPage = Math.max(1, mobileCurrentPage - 2);
        let endPage = Math.min(totalPages, mobileCurrentPage + 2);

        // Adjust if near the start or end
        if (mobileCurrentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (mobileCurrentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbersHtml += `
                <button class="tm-page-btn ${i === mobileCurrentPage ? 'active' : ''}" 
                        data-page="${i}">${i}</button>
            `;
        }

        pageNumbersContainer.innerHTML = pageNumbersHtml;

        // Add click handlers to page number buttons
        pageNumbersContainer.querySelectorAll('.tm-page-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                mobileCurrentPage = parseInt(this.dataset.page);
                renderMobileAlerts();
            });
        });
    }
}

/**
 * Initialize mobile view event listeners
 */
function initMobileEventListeners() {
    // Search input
    const searchInput = document.getElementById('mobileSearchAlertas');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyMobileFilters, 300); 
        });
    }

    // Status filter
    const estadoFilter = document.getElementById('mobileFilterEstado');
    if (estadoFilter) {
        estadoFilter.addEventListener('change', applyMobileFilters);
    }

    // Page size selector
    const pageSizeSelect = document.getElementById('mobilePageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function () {
            mobilePageSize = parseInt(this.value);
            mobileCurrentPage = 1;
            renderMobileAlerts();
        });
    }

    // Prev/Next buttons
    const prevBtn = document.querySelector('.tm-page-prev');
    const nextBtn = document.querySelector('.tm-page-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            if (mobileCurrentPage > 1) {
                mobileCurrentPage--;
                renderMobileAlerts();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            const totalPages = Math.ceil(filteredAlertas.length / mobilePageSize);
            if (mobileCurrentPage < totalPages) {
                mobileCurrentPage++;
                renderMobileAlerts();
            }
        });
    }
}

// ============================================
// MAIN DATA LOADING
// ============================================

/**
 * Load and display alerts in both DataTable and Mobile view
 */
async function cargarAlertas() {
    showLoading(true);

    try {
        const resp = await fetch(`${window.API_BASE}/api/alerta/listar`);
        if (!resp.ok) {
            console.error('Error loading alerts:', resp.status);
            showLoading(false);
            return;
        }

        const allAlertas = await resp.json();
        const alertasFiltradas = filtrarAlertasPorRol(allAlertas);

        // Store for mobile view
        allAlertasData = alertasFiltradas;
        filteredAlertas = [...alertasFiltradas];

        // Update stats
        updateStats(alertasFiltradas);

        // Desktop: DataTable
        const tableData = transformarDatosTabla(alertasFiltradas);
        if (dataTableInstance) {
            dataTableInstance.clear().rows.add(tableData).draw();
        } else {
            dataTableInstance = initDataTable('tablaAlertas', [7], {
                data: tableData,
                columns: [
                    { data: 'id' },
                    { data: 'titulo' },
                    { data: 'mensaje' },
                    { data: 'fecha' },
                    { data: 'publico' },
                    { data: 'estado' },
                    { data: 'tipo' },
                    { data: 'acciones' }
                ],
                order: [[0, 'desc']]
            });
        }

        renderMobileAlerts();

    } catch (error) {
        console.error('Error loading alerts:', error);
    } finally {
        showLoading(false);
    }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Show delete confirmation modal
 * @param {number} id - Alert ID to delete
 */
function confirmarEliminar(id) {
    alertaIdToDelete = id;
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
    modal.show();
}

/**
 * Delete an alert by ID
 * @param {number} id - Alert ID to delete
 */
async function borrarAlerta(id) {
    showLoading(true);
    try {
        const resp = await fetch(`${window.API_BASE}/api/alerta/${id}`, { method: 'DELETE' });
        if (resp.ok) {
            showNotification('success', 'Alerta eliminada', 'La alerta fue eliminada correctamente.');
            await cargarAlertas();
            if (typeof actualizarContadorAlertas === 'function') {
                await actualizarContadorAlertas();
            }
        } else {
            showNotification('error', 'Error', 'No se pudo eliminar la alerta.');
        }
    } catch (error) {
        console.error('Error deleting alert:', error);
        showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
        showLoading(false);
    }
}

function resetForm() {
    const form = document.getElementById('formAlerta');
    const publico = document.getElementById('publico');
    const buseta = document.getElementById('buseta');
    const encargado = document.getElementById('encargado');

    if (form) form.reset();
    if (publico) publico.value = 'todos';
    if (buseta) buseta.value = '';
    if (encargado) encargado.value = '';

    document.querySelectorAll('#tipoAlertaGroup input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });
    // Also reset the hidden select
    const tipoAlerta = document.getElementById('tipoAlerta');
    if (tipoAlerta) tipoAlerta.value = '';

    togglePublicoGroups();
}

/**
 * Handle form submission to create a new alert
 * @param {Event} e - Submit event
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const publicoValue = document.getElementById('publico').value;
    const busetaValue = document.getElementById('buseta').value;
    const encargadoValue = document.getElementById('encargado').value;

    // Validation
    if (publicoValue === 'buseta' && !busetaValue) {
        showNotification('warning', 'Campo requerido', 'Debe seleccionar una buseta.');
        return;
    }
    if (publicoValue === 'encargado' && !encargadoValue) {
        showNotification('warning', 'Campo requerido', 'Debe seleccionar un encargado.');
        return;
    }

    // Build public destination value
    let publicoFinal = publicoValue;
    if (publicoValue === 'buseta') publicoFinal = `buseta:${busetaValue}`;
    if (publicoValue === 'encargado') publicoFinal = `usuario:${encargadoValue}`;

    const payload = {
        EnviadoPor: Number(window.CURRENT_USER_ID),
        Titulo: document.getElementById('tituloAlerta').value,
        TipoAlerta: document.getElementById('tipoAlerta').value,
        Mensaje: document.getElementById('contenidoAlerta').value,
        PublicoDestino: publicoFinal,
        FechaPublicacion: document.getElementById('fechaPublicacion').value
    };

    showLoading(true);

    try {
        const resp = await fetch(`${window.API_BASE}/api/alerta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalAlerta')).hide();
            resetForm();
            showNotification('success', '¡Alerta enviada!', 'La alerta fue creada y enviada correctamente.');
            await cargarAlertas();
            if (typeof actualizarContadorAlertas === 'function') {
                await actualizarContadorAlertas();
            }
        } else {
            showNotification('error', 'Error al guardar', 'No se pudo guardar la alerta. Por favor, intente de nuevo.');
        }
    } catch (error) {
        console.error('Error saving alert:', error);
        showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
        showLoading(false);
    }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

/**
 * Initialize all event listeners for the page
 */
function initEventListeners() {
    // Form submission
    const formAlerta = document.getElementById('formAlerta');
    if (formAlerta) {
        formAlerta.addEventListener('submit', handleFormSubmit);
    }

    // Public destination dropdown change
    const publico = document.getElementById('publico');
    if (publico) {
        publico.addEventListener('change', togglePublicoGroups);
    }

    // Modal shown event - reset form and focus
    const modalAlerta = document.getElementById('modalAlerta');
    if (modalAlerta) {
        modalAlerta.addEventListener('shown.bs.modal', function () {
            resetForm();
            document.getElementById('tituloAlerta')?.focus();
        });
    }

    // Confirm delete button
    const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener('click', async function () {
            if (alertaIdToDelete) {
                bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar')).hide();
                await borrarAlerta(alertaIdToDelete);
                alertaIdToDelete = null;
            }
        });
    }

    document.querySelectorAll('#tipoAlertaGroup input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.getElementById('tipoAlerta').value = this.value;
        });
    });

    // Initialize mobile-specific event listeners
    initMobileEventListeners();
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the alerts page
 */
async function initAlertasPage() {
    initEventListeners();
    await cargarLookups();
    await marcarAlertasComoLeidas();
    await cargarAlertas();

    // Update the global alert counter in the layout (if exists)
    if (typeof actualizarContadorAlertas === 'function') {
        await actualizarContadorAlertas();
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initAlertasPage);