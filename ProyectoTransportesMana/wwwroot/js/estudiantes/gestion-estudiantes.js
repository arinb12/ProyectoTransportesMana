// ============================================
// MODULE STATE
// ============================================
let dataTableInstance = null;
let telefonoMask = null;
let estudianteIdToDelete = null;
let isPageLoaded = false;

// DOM Elements (cached on init)
const DOM = {
    modal: null,
    form: null,
    encargado: null,
    maestra: null,
    institucion: null,
    telefono: null,
    busetas: null,
    loadingOverlay: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show or hide the loading overlay
 * @param {boolean} show - Whether to show the overlay
 * @param {string} message - Optional custom message to display
 */
function showLoading(show = true, message = null) {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.style.display = show ? 'flex' : 'none';

        // Update message if provided
        if (message) {
            const messageEl = DOM.loadingOverlay.querySelector('p');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
}

/**
 * Show notification using SweetAlert2
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {string} title - Notification title
 * @param {string} text - Notification message
 * @param {boolean} toast - Show as toast notification
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
            Swal.fire({
                icon: type,
                title: title,
                text: text
            });
        }
    } else {
        alert(`${title}\n${text}`);
    }
}

/**
 * Get anti-forgery token from the page
 * @returns {string} The token value
 */
function getAntiForgeryToken() {
    const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
    return tokenInput ? tokenInput.value : '';
}

// ============================================
// SELECT2 INITIALIZATION
// ============================================

/**
 * Initialize Select2 for single select elements
 * @param {jQuery} $el - jQuery element
 */
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
        // Trigger validation if available
        const $form = $(this).closest('form');
        if ($form.length && $form.data('validator')) {
            $(this).valid();
        }
    });
}

/**
 * Initialize Select2 for multiple select elements
 * @param {jQuery} $el - jQuery element
 */
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

/**
 * Initialize phone number mask
 */
function initTelefonoMask() {
    if (!DOM.telefono || typeof IMask === 'undefined') return;

    // Destroy existing mask if any
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

    // Trigger validation on input
    $(DOM.telefono).on('input blur', function () {
        $(this).trigger('change');
        const $form = $(this).closest('form');
        if ($form.length && $form.data('validator')) {
            $form.valid();
        }
    });
}

/**
 * Destroy phone mask
 */
function destroyTelefonoMask() {
    if (telefonoMask) {
        telefonoMask.destroy();
        telefonoMask = null;
    }
}

// ============================================
// BUSETAS LOADING
// ============================================

/**
 * Load busetas from the server
 * @param {boolean} showLoadingOverlay - Whether to show loading overlay
 */
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

// Expose for external use
window.cargarBusetas = cargarBusetas;

// ============================================
// FORM HANDLING
// ============================================

/**
 * Reset the form to create mode
 */
function nuevoEstudiante() {
    // Reset form
    if (DOM.form) {
        DOM.form.reset();
    }

    // Update modal title and action
    $('#modalEstudianteLabel').html('<i class="bi bi-mortarboard me-2"></i>Registrar Estudiante');
    $('#estudianteForm').attr('action', '/Estudiantes/RegistrarEstudiante');

    // Clear hidden ID
    $('#IdUsuario').val('');

    // Reset Select2 elements
    [DOM.encargado, DOM.maestra, DOM.institucion].forEach(el => {
        if (el) {
            $(el).val('').trigger('change');
            $(el).removeClass('is-invalid');
        }
    });

    // Reset busetas
    if (DOM.busetas) {
        $(DOM.busetas).val(null).trigger('change');
    }

    // Reset active checkbox
    $('#ActivoCheck').prop('checked', true);

    // Clear validation states
    $('#estudianteForm').find('.is-invalid').removeClass('is-invalid');
    $('#estudianteForm').find('.is-valid').removeClass('is-valid');
}

// Expose globally
window.nuevoEstudiante = nuevoEstudiante;

/**
 * Load student data for editing
 * @param {number} id - Student ID
 */
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

        // Update modal title and action
        $('#modalEstudianteLabel').html('<i class="bi bi-pencil me-2"></i>Editar Estudiante');
        $('#estudianteForm').attr('action', '/Estudiantes/ActualizarEstudiante');

        // Fill form fields
        $('#IdUsuario').val(data.id);
        $('#Nombre').val(data.nombre);
        $('#PrimerApellido').val(data.primerApellido);
        $('#SegundoApellido').val(data.segundoApellido || '');
        $('#Seccion').val(data.seccion);
        $('#Telefono').val(data.telefono);
        $('#ActivoCheck').prop('checked', data.activo);

        // Set Select2 values
        $('#IdEncargado').val(data.idEncargado).trigger('change');
        $('#IdInstitucion').val(data.idInstitucion).trigger('change');
        $('#IdMaestra').val(data.idMaestra).trigger('change');

        // Load assigned busetas
        const busetasResponse = await fetch(`/Estudiantes/ObtenerBusetasPorEstudiante?id=${id}`);
        if (busetasResponse.ok) {
            const busetasAsignadas = await busetasResponse.json();
            $('#Busetas').val(busetasAsignadas.map(String)).trigger('change');
        }

        // Show modal
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEstudiante'));
        modal.show();

    } catch (error) {
        console.error('Error loading student:', error);
        showNotification('error', 'Error', 'Error al cargar los datos del estudiante.');
    } finally {
        showLoading(false);
    }
}

// Expose globally
window.editarEstudiante = editarEstudiante;

/**
 * Handle form submission
 * @param {Event} e - Submit event
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const action = form.action;
    const isCreate = action.includes('RegistrarEstudiante');

    // Build FormData
    const formData = new FormData(form);

    // Handle busetas (multiple select)
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
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEstudiante'));
            if (modal) modal.hide();

            // Show success notification and reload
            showNotification(
                'success',
                data.title || (isCreate ? 'Estudiante creado' : 'Estudiante actualizado'),
                data.message || 'Los datos fueron guardados correctamente.',
                true
            );

            // Reload after short delay
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

/**
 * Show delete confirmation
 * @param {number} id - Student ID to delete
 */
function eliminarEstudiante(id) {
    if (typeof Swal === 'undefined') {
        if (confirm('¿Está seguro que desea eliminar este estudiante?')) {
            performDelete(id);
        }
        return;
    }

    Swal.fire({
        title: '¿Eliminar estudiante?',
        text: 'Esta acción marcará al estudiante como eliminado y no podrá usar el sistema.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="bi bi-trash me-1"></i>Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            performDelete(id);
        }
    });
}

/**
 * Perform the actual delete operation
 * @param {number} id - Student ID
 */
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

// Expose globally
window.eliminarEstudiante = eliminarEstudiante;

// ============================================
// STATUS TOGGLE
// ============================================

/**
 * Toggle student active status
 * @param {number} id - Student ID
 * @param {boolean} isChecked - New status
 */
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
        } else {
            // Revert the checkbox
            document.getElementById(`estado-${id}`).checked = !isChecked;
            showNotification(
                'error',
                data?.title || 'Error',
                data?.message || 'No se pudo actualizar el estado.'
            );
        }
    } catch (error) {
        console.error('Error changing status:', error);
        // Revert the checkbox
        document.getElementById(`estado-${id}`).checked = !isChecked;
        showNotification('error', 'Error', 'Ocurrió un error inesperado.');
    }
}

// Expose globally
window.cambiarEstadoEstudiante = cambiarEstadoEstudiante;

// ============================================
// MODAL EVENT HANDLERS
// ============================================

/**
 * Handle modal shown event
 */
function onModalShown() {
    // Initialize Select2 for dropdowns
    initSelect2($(DOM.encargado));
    initSelect2($(DOM.maestra));
    initSelect2($(DOM.institucion));

    // Initialize phone mask
    initTelefonoMask();

    // Focus first input
    $('#Nombre').focus();
}

/**
 * Handle modal hidden event
 */
function onModalHidden() {
    // Reset form
    nuevoEstudiante();

    // Destroy phone mask
    destroyTelefonoMask();

    // Remove validation classes
    $(DOM.telefono).removeClass('is-invalid is-valid');
}

// ============================================
// VALIDATION SETUP
// ============================================

/**
 * Setup custom phone validation
 */
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
// INITIAL DATA LOADING
// ============================================

/**
 * Load all initial data for the page
 * Shows loading overlay during the process
 */
async function loadInitialData() {
    // Show loading overlay with initial message
    showLoading(true, 'Cargando estudiantes...');

    try {
        // Load busetas for the form
        await cargarBusetas(false); // Don't show separate loading for this

        // Initialize Select2 for busetas after loading
        initSelect2Multiple($(DOM.busetas));

        // Initialize DataTable
        if (typeof initDataTable === 'function') {
            dataTableInstance = initDataTable('tablaEstudiantes', [7, 8], {
                order: [[0, 'asc']],
                pageLength: 10
            });
        }

        isPageLoaded = true;

    } catch (error) {
        console.error('Error loading initial data:', error);
        showNotification('error', 'Error de carga', 'No se pudieron cargar los datos iniciales.');
    } finally {
        // Hide loading overlay
        showLoading(false);
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the page
 */
function initPage() {
    // Cache DOM elements first
    DOM.modal = $('#modalEstudiante');
    DOM.form = document.getElementById('estudianteForm');
    DOM.encargado = document.getElementById('IdEncargado');
    DOM.maestra = document.getElementById('IdMaestra');
    DOM.institucion = document.getElementById('IdInstitucion');
    DOM.telefono = document.getElementById('Telefono');
    DOM.busetas = document.getElementById('Busetas');
    DOM.loadingOverlay = document.getElementById('loading-overlay');

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

    // Handle SweetAlert payload from server (after page load)
    if (window.__swalPayload && window.__swalPayload.type) {
        const { type, title, text } = window.__swalPayload;
        if (type && title) {
            // Delay to ensure page is ready
            setTimeout(() => showNotification(type, title, text), 500);
        }
    }

    // Load initial data (busetas, DataTable, etc.)
    loadInitialData();
}

// ============================================
// DOCUMENT READY
// ============================================

$(function () {
    initPage();
});