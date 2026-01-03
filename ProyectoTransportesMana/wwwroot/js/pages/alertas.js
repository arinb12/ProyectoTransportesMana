// Data maps for lookups
const encargadosMap = new Map();
const busetasMap = new Map();
let alertaIdToDelete = null;
let dataTableInstance = null;

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
        SwalNotify(type, title, text, true); // true = show as toast
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
        // Fallback to native alert
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
        // Admin or Assistant: all alerts
        return allAlertas;
    } else if (rolActual === 2) {
        // Legal Guardian: only massive alerts or alerts directed to this user
        return allAlertas.filter(a => {
            const destino = a.publico_destino ?? a.PublicoDestino ?? '';
            return destino === 'todos' || destino === `usuario:${userId}`;
        });
    } else {
        // Other roles: only massive alerts
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

/**
 * Load and display alerts in the DataTable
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

        // Update stats
        updateStats(alertasFiltradas);

        // Prepare data for DataTable
        const tableData = transformarDatosTabla(alertasFiltradas);

        // Initialize or refresh DataTable
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

/**
 * Reset the alert form to default values
 */
function resetForm() {
    const form = document.getElementById('formAlerta');
    const publico = document.getElementById('publico');
    const buseta = document.getElementById('buseta');
    const encargado = document.getElementById('encargado');

    if (form) form.reset();
    if (publico) publico.value = 'todos';
    if (buseta) buseta.value = '';
    if (encargado) encargado.value = '';

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

            // Show success notification
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