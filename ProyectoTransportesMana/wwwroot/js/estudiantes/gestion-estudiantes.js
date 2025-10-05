$(function () {
    // 1) DataTable
    if (typeof initDataTable === "function") {
        // OJO: asegúrate que el índice de la columna de acciones (7) sea correcto
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
                $(this).trigger('input');
                if ($(this).valid) { $(this).valid(); }
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
        const form = $('#estudianteForm')[0];
        if (form) form.reset();
    });

    const $form = $('#estudianteForm');
    if ($form.length && $form.data('validator')) {
        $form.data('validator').settings.ignore = ':hidden:not(.select2-hidden-accessible)';
    }
});


(function () {
    function ensureSwalReady(callback) {
        if (window.Swal && typeof window.Swal.fire === "function") {
            callback();
            return;
        }
        var script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        script.async = true;
        script.onload = callback;
        document.head.appendChild(script);
    }
    function toOptions(arg1, arg2, arg3) {
        if (typeof arg1 === "object" && arg1 !== null) {
            return Object.assign({ confirmButtonText: "OK" }, arg1);
        }
        return {
            icon: arg1 || "info", 
            title: arg2 || "",
            text: arg3 || "",
            confirmButtonText: "OK"
        };
    }

    function SwalNotify(arg1, arg2, arg3) {
        var opts = toOptions(arg1, arg2, arg3);
        ensureSwalReady(function () { window.Swal.fire(opts); });
    }

    window.SwalNotify = SwalNotify;

    $(function () {
        var p = window.__swalPayload;
        if (p && (p.type || p.icon)) {
            var icon = p.icon || p.type;
            SwalNotify({ icon: icon, title: p.title || "", text: p.text || "" });
            try { delete window.__swalPayload; } catch { window.__swalPayload = null; }
        }
    });
})();
