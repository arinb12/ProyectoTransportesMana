$(function () {
    // Inicializar DataTable
    if (typeof initDataTable === "function") {
        initDataTable('tablaEstudiantes', [8]);
    }

    const $modal = $('#modalEstudiante');
    const $encargado = $('#IdEncargado');
    const $maestra = $('#IdMaestra');
    const $institucion = $('#IdInstitucion');
    const $form = $('#estudianteForm');
    const $telefono = $('#Telefono');
    const $busetas = $('#Busetas');

    // ==============================
    // Función para cargar busetas
    // ==============================
    async function cargarBusetas() {
        try {
            const resp = await fetch('/Estudiantes/ObtenerBusetas');
            if (!resp.ok) throw new Error('Error al cargar busetas');
            const data = await resp.json();

            $busetas.empty(); // limpiar las opciones anteriores
            data.forEach(b => {
                const opt = new Option(b.texto, b.id, false, false);
                $busetas.append(opt);
            });
        } catch (err) {
            console.error('No se pudieron cargar las busetas:', err);
        }
    }
    window.cargarBusetas = cargarBusetas;

    // ==============================
    // Máscaras y validaciones
    // ==============================
    let telefonoMask = null;
    function initTelefonoMask() {
        if (!$telefono.length || typeof IMask === 'undefined') return;

        telefonoMask = IMask($telefono[0], {
            mask: [
                { mask: '0000-0000' },
                { mask: '+{506} 0000-0000' }
            ],
            lazy: false
        });

        $telefono.on('input blur', function () {
            $(this).trigger('change');
            if ($form.length && $form.valid) { $form.valid(); }
        });
    }

    // ==============================
    // Inicializadores de Select2
    // ==============================
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

    function initSelect2Multiple($el) {
        if (!$el.length || !$.fn.select2) return;
        $el.select2({
            placeholder: $el.data('placeholder') || '',
            allowClear: true,
            width: '100%',
            dropdownParent: $modal,
            closeOnSelect: false
        });
    }
    window.initSelect2Multiple = initSelect2Multiple;

    // ==============================
    // Validación de teléfono
    // ==============================
    if ($.validator && !$.validator.methods.crphone) {
        $.validator.addMethod('crphone', function (value) {
            if (!value) return true;
            const digits = (value.match(/\d/g) || []).join('');
            return (digits.length === 8 || (digits.length === 11 && digits.startsWith('506')));
        }, 'Ingrese un teléfono válido (####-#### o +506 ####-####).');

        if ($form.length && $form.data('validator')) {
            $telefono.rules('add', { crphone: true });
        }
    }

    // ==============================
    // Cargar busetas al iniciar
    // ==============================
    (async function initBusetas() {
        try {
            await cargarBusetas(); // solo una vez
            initSelect2Multiple($busetas);
        } catch (err) {
            console.error('Error al inicializar busetas:', err);
        }
    })();

    // ==============================
    // Eventos del modal
    // ==============================
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

        $busetas.val(null).trigger('change');

        if (telefonoMask) { telefonoMask.destroy(); telefonoMask = null; }
        const form = $form[0];
        if (form) form.reset();
        $telefono.removeClass('is-invalid is-valid');
    });

    if ($form.length && $form.data('validator')) {
        $form.data('validator').settings.ignore = ':hidden:not(.select2-hidden-accessible)';
    }
});


// =============================================
// FUNCIONES GLOBALES
// =============================================
function eliminarEstudiante(id) {
    ensureSwalReady(() => {
        Swal.fire({
            title: "¿Eliminar estudiante?",
            text: "Esta acción marcará al estudiante como eliminado y no podrá usar el sistema.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, eliminar",
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
        .then(async r => {
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

            const resp = await fetch(`/Estudiantes/ObtenerBusetasPorEstudiante?id=${id}`);
            if (resp.ok) {
                const busetasAsignadas = await resp.json();
                $('#Busetas').val(busetasAsignadas.map(String)).trigger('change');
            }

            $("#modalEstudiante").modal("show");
        })
        .catch(err => {
            console.error("Error al cargar estudiante:", err);
            SwalNotify("error", "Error", "Error al cargar los datos del estudiante.");
        });
}

// =============================================
// Submit del formulario
// =============================================
$(document).on("submit", "#estudianteForm", async function (e) {
    e.preventDefault();

    const form = this;
    const action = form.action;
    const isCreate = action.includes("RegistrarEstudiante");

    const formData = new FormData(form);
    const busetasSeleccionadas = $('#Busetas').val() || [];
    formData.delete('Busetas');
    busetasSeleccionadas.forEach(b => formData.append('Busetas', b));

    const resp = await fetch(action, {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const data = await resp.json().catch(() => null);

    if (resp.ok && data?.ok) {
        ensureSwalReady(() => {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: data.title || (isCreate ? "Estudiante creado correctamente" : "Estudiante actualizado correctamente"),
                text: data.message || "",
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            }).then(() => window.location.reload());
        });
    } else {
        SwalNotify("error", data?.title || "Error", data?.message || "No se pudo guardar el estudiante.");
    }
});