(function () {
    'use strict';

    // ============================================
    // PORTAL PADRES - LÓGICA DE INTERFAZ
    // Dependencias: gestion-common.js (GestionCommon)
    // ============================================

    // Elementos del DOM (cache)
    const DOM = {
        loadingOverlay: document.getElementById('loading-overlay'),
        modal: null,
        form: null,
        idEstudiante: document.getElementById('IdEstudianteCambio'),
        nombreEstudiante: document.getElementById('NombreEstudianteCambio'),
        fecha: document.getElementById('FechaCambio'),
        tipo: document.getElementById('TipoCambio'),
        horaAjustada: document.getElementById('HoraAjustadaCambio'),
        motivo: document.getElementById('MotivoCambio')
    };

    // ============================================
    // UTILIDADES (delegadas a GestionCommon)
    // ============================================
    function showLoading(show = true, message = 'Procesando...') {
        if (!DOM.loadingOverlay) return;
        GestionCommon.showLoading(DOM.loadingOverlay, show, message);
    }

    function showNotification(type, title, text, toast = true) {
        GestionCommon.showNotification(type, title, text, toast);
    }

    function getAntiForgeryToken() {
        return GestionCommon.getAntiForgeryToken();
    }

    // ============================================
    // APERTURA DEL MODAL (desde botones)
    // ============================================
    window.abrirModalCambioHorario = function (idEstudiante, nombre) {
        // Limpiar campos
        DOM.idEstudiante.value = idEstudiante;
        DOM.nombreEstudiante.value = nombre;
        DOM.fecha.value = '';
        DOM.tipo.value = '';
        DOM.horaAjustada.value = '';
        DOM.motivo.value = '';

        // Inicializar modal y mostrar
        if (!DOM.modal) {
            DOM.modal = new bootstrap.Modal(document.getElementById('cambioHorarioModal'));
        }
        DOM.modal.show();
    };

    // ============================================
    // ENVÍO DEL FORMULARIO VÍA AJAX
    // ============================================
    async function handleFormSubmit(e) {
        e.preventDefault();

        // Validación rápida
        if (!DOM.idEstudiante.value || !DOM.fecha.value || !DOM.tipo.value || !DOM.horaAjustada.value || !DOM.motivo.value) {
            showNotification('warning', 'Campos incompletos', 'Complete todos los campos requeridos.', false);
            return;
        }

        // Construir FormData
        const formData = new FormData();
        formData.append('idEstudiante', DOM.idEstudiante.value);
        formData.append('fecha', DOM.fecha.value);
        formData.append('tipo', DOM.tipo.value);
        formData.append('horaAjustada', DOM.horaAjustada.value);
        formData.append('motivo', DOM.motivo.value);
        formData.append('__RequestVerificationToken', getAntiForgeryToken());

        showLoading(true, 'Enviando solicitud...');

        try {
            const response = await fetch('/Padres/RegistrarCambioHorario', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = await response.json().catch(() => null);

            if (response.ok && result?.ok) {
                showNotification(
                    'success',
                    result.title || 'Cambio registrado',
                    result.message || 'La solicitud de cambio fue enviada correctamente.',
                    true
                );
                DOM.modal.hide();
            } else {
                showNotification(
                    'error',
                    result?.title || 'Error',
                    result?.message || 'No se pudo registrar el cambio. Intente nuevamente.',
                    false
                );
            }
        } catch (error) {
            console.error('Error al enviar cambio de horario:', error);
            showNotification('error', 'Error de conexión', 'No se pudo conectar con el servidor.', false);
        } finally {
            showLoading(false);
        }
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    function init() {
        // Cache del formulario
        DOM.form = document.getElementById('formCambioHorario');

        // Asignar evento submit
        if (DOM.form) {
            DOM.form.addEventListener('submit', handleFormSubmit);
        }

        // Limpiar token antifalsificación (si existe)
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (tokenInput && !tokenInput.value) {
            // Opcional: cargar token dinámicamente si es necesario
        }

        // Si se recibe una notificación desde TempData (opcional)
        if (window.__swalPayload && window.__swalPayload.type) {
            setTimeout(() => {
                GestionCommon.showNotification(
                    window.__swalPayload.type,
                    window.__swalPayload.title,
                    window.__swalPayload.text
                );
            }, 500);
        }
    }

    // Esperar a que el DOM esté listo
    document.addEventListener('DOMContentLoaded', init);
})();