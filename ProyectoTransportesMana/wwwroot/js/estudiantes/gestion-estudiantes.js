$(function () {
    // 1) DataTable
    if (typeof initDataTable === "function") {
        initDataTable('tablaEstudiantes', [7]);
    }

    // 2) Select2 dentro del modal
    const $modal = $('#modalEstudiante');
    const $encargado = $('#encargado');
    const $maestra = $('#maestra');
    const $institucion = $('#institucion');


    if ($encargado.length && $.fn.select2) {
        $encargado.select2({
            placeholder: "-- Seleccione un encargado --",
            allowClear: true,
            width: '100%',
            dropdownParent: $modal
        });
    }

    if ($maestra.length && $.fn.select2) {
        $maestra.select2({
            placeholder: "-- Seleccione una maestra --",
            allowClear: true,
            width: '100%',
            dropdownParent: $modal
        });
    }

    if ($institucion.length && $.fn.select2) {
        $institucion.select2({
            placeholder: "-- Seleccione una institucion --",
            allowClear: true,
            width: '100%',
            dropdownParent: $modal
        });
    }

    // 3) IMask para teléfono
    const telInput = document.getElementById('telefono');
    if (window.IMask && telInput) {
        IMask(telInput, {
            mask: '0000-0000',
            lazy: true,
            placeholderChar: '_'
        });
    }

    // 4) Reset de Select2 al cerrar modal
    $modal.on('hidden.bs.modal', function () {
        $encargado.val(null).trigger('change');
        $maestra.val(null).trigger('change');
        $institucion.val(null).trigger('change');
    });
});
