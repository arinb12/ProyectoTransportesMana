$(function () {
    // 1) DataTable
    if (typeof initDataTable === "function") {
        initDataTable('tablaEstudiantes', [8]);
    }

    const $modal = $('#modalEstudiante');
    const $encargado = $('#IdEncargado');
    const $maestra = $('#IdMaestra');
    const $institucion = $('#IdInstitucion');
    const $form = $('#estudianteForm');
    const $telefono = $('#Telefono');

    let telefonoMask = null;
    function initTelefonoMask() {
        if (!$telefono.length || typeof IMask === 'undefined') return;

        // Acepta "####-####" o "+506 ####-####"
        telefonoMask = IMask($telefono[0], {
            mask: [
                { mask: '0000-0000' },
                { mask: '+{506} 0000-0000' }
            ],
            lazy: false,
            commit: function (value, masked) {
                masked._value = value;
            }
        });

        $telefono.on('input blur', function () {
            $(this).trigger('change');
            if ($form.length && $form.valid) { $form.valid(); }
        });
    }

    function initSelect2($el) {
        if (!$el.length || !$.fn.select2) return;
        $el.select2({
            placeholder: $el.data('placeholder') || '',
            allowClear: true,
            width: 'resolve',
            dropdownParent: $modal
        })
            .on('change.select2', function () {
                $(this).trigger('input');
                if ($(this).valid) { $(this).valid(); }
            });
    }

    if ($.validator && !$.validator.methods.crphone) {
        $.validator.addMethod('crphone', function (value, element) {
            if (!value) return true;
            const digits = (value.match(/\d/g) || []).join('');
            if (digits.length === 8) return true;
            if (digits.length === 11 && digits.startsWith('506')) return true;
            return false;
        }, 'Ingrese un teléfono válido (####-#### o +506 ####-####).');

        if ($form.length && $form.data('validator')) {
            $telefono.rules('add', { crphone: true });
        }
    }

    $modal.on('shown.bs.modal', function () {
        initSelect2($encargado);
        initSelect2($maestra);
        initSelect2($institucion);
        initTelefonoMask(); 
    });

    $modal.on('hidden.bs.modal', function () {
        [$encargado, $maestra, $institucion].forEach($s => {
            $s.val('').trigger('change');
            $s.removeClass('is-invalid');
        });
        if (telefonoMask) { telefonoMask.destroy(); telefonoMask = null; }
        const form = $form[0];
        if (form) form.reset();
        $telefono.removeClass('is-invalid is-valid');
    });

    if ($form.length && $form.data('validator')) {
        $form.data('validator').settings.ignore = ':hidden:not(.select2-hidden-accessible)';
    }
});


function eliminarEstudiante(id) {
    ensureSwalReady(() => {
        Swal.fire({
            title: "\u00BfEliminar estudiante?",
            text: "Esta acci\u00F3n marcar\u00E1 al estudiante como eliminado y no podr\u00E1 usar el sistema.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "S\u00ED, eliminar",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (!result.isConfirmed) return;

            fetch(`/Estudiantes/EliminarEstudiante/${id}`, {
                method: "POST",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/json",
                    "RequestVerificationToken":
                        document.querySelector('input[name="__RequestVerificationToken"]').value
                }
            })
                .then(async (response) => {
                    if (response.redirected) {
                        window.location.href = response.url;
                        return;
                    }

                    const data = await response.json().catch(() => null);

                    if (response.ok && data?.ok) {
                        Swal.fire({
                            icon: "success",
                            title: data.title || "Estudiante eliminado",
                            text: data.message || "El estudiante fue eliminado correctamente."
                        }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        SwalNotify("error", data?.title || "Error al eliminar", data?.message || "No se pudo eliminar el estudiante.");
                    }
                })
                .catch(() => {
                    SwalNotify("error", "Error", "Ocurrió un error inesperado.");
                });
        });
    });
}

function cambiarEstadoEstudiante(id, isChecked) {
    fetch(`/Estudiantes/CambiarEstado?id=${id}&activo=${isChecked}`, {
        method: "POST",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "RequestVerificationToken":
                document.querySelector('input[name="__RequestVerificationToken"]').value
        }
    })
        .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (data?.ok) {
                ensureSwalReady(() => {
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: data.title,
                        text: data.message,
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true
                    });
                });
            } else {
                SwalNotify("error", data?.title || "Error", data?.message || "No se pudo actualizar el estado.");
            }
        })
        .catch(() => {
            SwalNotify("error", "Error", "Ocurrió un error inesperado.");
        });
}

function editarEstudiante(id) {
    fetch(`/Estudiantes/ObtenerParaEditar?id=${id}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
    })
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(r => {
            if (!r?.ok || !r.data) {
                SwalNotify("error", "Error", r?.message || "No se pudieron cargar los datos del estudiante.");
                return;
            }
            const data = r.data;

            $("#modalEstudianteLabel").text("Editar Estudiante");
            $("#estudianteForm").attr("action", "/Estudiantes/ActualizarEstudiante");
            $("#IdUsuario").val(data.id);
            $("#Nombre").val(data.nombre);
            $("#PrimerApellido").val(data.primerApellido);
            $("#SegundoApellido").val(data.segundoApellido || "");
            $("#IdEncargado").val(data.idEncargado).trigger("change");
            $("#IdInstitucion").val(data.idInstitucion).trigger("change");
            $("#IdMaestra").val(data.idMaestra).trigger("change");
            $("#Seccion").val(data.seccion);
            $("#Telefono").val(data.telefono);
            $("#Activo").prop("checked", data.activo);

            $("#modalEstudiante").modal("show");
        })
        .catch(err => {
            console.error("Error al cargar estudiante:", err);
            SwalNotify("error", "Error", "Error al cargar los datos del estudiante.");
        });
}


$(document).on("submit", "#estudianteForm", function (e) {
    e.preventDefault();

    const form = this;
    const action = form.action;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    fetch(action, {
        method: "POST",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            "RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
        },
        body: formData
    })
        .then(resp => resp.json())
        .then(data => {
            if (data.ok) {
                $("#modalEstudiante").modal("hide");
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Estudiante actualizado",
                    text: data.message,
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                }).then(() => window.location.reload());
            } else {
                SwalNotify("error", "Error", data.message || "No se pudo actualizar el estudiante.");
            }
        })
        .catch(() => {
            SwalNotify("error", "Error", "Error al guardar los cambios.");
        });
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
        script.onerror = callback;
        document.head.appendChild(script);
    }

    window.ensureSwalReady = ensureSwalReady;

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

    function SwalNotify(arg1, arg2, arg3, asToast = false) {
        var opts = toOptions(arg1, arg2, arg3);

        const useToast = asToast || /error|guard|fall/i.test(opts.text || "");

        ensureSwalReady(function () {
            if (window.Swal && typeof window.Swal.fire === "function") {
                if (useToast) {
                    window.Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: opts.icon || "error",
                        title: opts.title || "Error",
                        text: opts.text || "",
                        showConfirmButton: false,
                        timer: 2500,
                        timerProgressBar: true
                    });
                } else {
                    window.Swal.fire(opts);
                }
            } else {
                alert((opts.title || "Aviso") + "\n" + (opts.text || ""));
            }
        });
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
