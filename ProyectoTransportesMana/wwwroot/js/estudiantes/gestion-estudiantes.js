$(function () {
    // 1) DataTable
    if (typeof initDataTable === "function") {
        initDataTable('tablaEstudiantes', [7]);
    }

    // 2) Select2 dentro del modal (usar IDs reales generados por asp-for)
    const $modal = $('#modalEstudiante');
    const $encargado = $('#IdEncargado');
    const $maestra = $('#IdMaestra');
    const $institucion = $('#IdInstitucion');

    function initSelect2($el) {
        if (!$el.length || !$.fn.select2) return;
        $el.select2({
            placeholder: $el.data('placeholder') || '',
            allowClear: true,
            width: 'resolve',
            dropdownParent: $modal
        })
            // Mantener validación unobtrusive en selects ocultos por Select2
            .on('change.select2', function () {
                $(this).trigger('input').valid && $(this).valid();
            });
    }

    // Inicializar cuando el modal esté visible (para calcular bien el ancho)
    $modal.on('shown.bs.modal', function () {
        initSelect2($encargado);
        initSelect2($maestra);
        initSelect2($institucion);
    });

    // Reset limpio al cerrar (sin romper edición si precargas valores)
    $modal.on('hidden.bs.modal', function () {
        [$encargado, $maestra, $institucion].forEach($s => {
            $s.val('').trigger('change');
            $s.removeClass('is-invalid');
        });
        $('#estudianteForm')[0]?.reset();
    });


    const $form = $('#estudianteForm');
    if ($form.length && $form.data('validator')) {
        $form.data('validator').settings.ignore = ':hidden:not(.select2-hidden-accessible)';
    }
});
