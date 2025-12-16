(function () {

    const base = window.API_BASE || "";
    const API = `${base}/api/v1/gestion-maestras`;  // ← RUTA ACTUALIZADA

    $(function () {
        cargarMaestras();
        $("#btnGuardarMaestra").on("click", guardarMaestra);

        const modalEl = document.getElementById('modalMaestra');
        modalEl && modalEl.addEventListener('hidden.bs.modal', limpiarModal);
    });

    // ============================================================
    // LISTAR MAESTRAS
    // ============================================================
    function cargarMaestras() {
        $.get(API, function (data) {
            const tbody = $("#tablaMaestras tbody").empty();

            if (!data || data.length === 0) {
                tbody.append(`
                    <tr>
                        <td colspan="4" class="text-center text-muted">
                            <i class="fas fa-inbox fa-2x mb-2"></i>
                            <p>No hay maestras registradas</p>
                        </td>
                    </tr>
                `);
                return;
            }

            data.forEach(m => {
                const estadoIcono = m.activo
                    ? '<i class="fas fa-check-circle text-success"></i> Activo'
                    : '<i class="fas fa-times-circle text-muted"></i> Inactivo';

                tbody.append(`
                    <tr>
                        <td>${escapeHtml(m.nombre)}</td>
                        <td>${escapeHtml(m.seccion)}</td>
                        <td class="text-center">${estadoIcono}</td>
                        <td class="text-center">
                            <button onclick="editarMaestra(${m.idMaestra})" class="btn btn-sm btn-outline-primary me-1" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="eliminarMaestra(${m.idMaestra}, '${escapeAttr(m.nombre)}')" class="btn btn-sm btn-outline-danger" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });
        }).fail(function (xhr) {
            console.error("Error al cargar maestras:", xhr);
            Swal.fire("Error", "No se pudieron cargar las maestras", "error");
        });
    }

    // ============================================================
    // EDITAR MAESTRA
    // ============================================================
    window.editarMaestra = function (id) {
        $.get(`${API}/${id}`, function (m) {
            $("#IdMaestra").val(m.idMaestra);
            $("#Nombre").val(m.nombre);
            $("#Seccion").val(m.seccion);
            $("#Activo").prop("checked", m.activo);

            new bootstrap.Modal(document.getElementById("modalMaestra")).show();
        }).fail(function () {
            Swal.fire("Error", "No se pudo cargar la información de la maestra", "error");
        });
    };

    // ============================================================
    // ELIMINAR MAESTRA (LÓGICO)
    // ============================================================
    window.eliminarMaestra = function (id, nombre) {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `Se desactivará la maestra: <strong>${escapeHtml(nombre)}</strong>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `${API}/${id}`,
                    method: "DELETE",
                    success: function () {
                        Swal.fire({
                            icon: 'success',
                            title: 'Desactivada',
                            text: 'La maestra ha sido desactivada correctamente',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        cargarMaestras();
                    },
                    error: function (xhr) {
                        console.error("Error al eliminar:", xhr);
                        Swal.fire("Error", "No se pudo desactivar la maestra", "error");
                    }
                });
            }
        });
    };

    // ============================================================
    // GUARDAR (CREAR / EDITAR)
    // ============================================================
    function guardarMaestra() {
        const id = $("#IdMaestra").val();
        const nombre = $("#Nombre").val().trim();
        const seccion = $("#Seccion").val().trim();
        const activo = $("#Activo").is(":checked");

        // Validación
        if (!nombre || !seccion) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos requeridos',
                text: 'Por favor completa todos los campos obligatorios'
            });
            return;
        }

        const dto = {
            Nombre: nombre,
            Seccion: seccion,
            Activo: activo
        };

        // Modo EDITAR
        if (id) {
            dto.IdMaestra = parseInt(id);

            $.ajax({
                url: `${API}/${id}`,
                method: "PUT",
                contentType: "application/json",
                data: JSON.stringify(dto),
                success: function () {
                    Swal.fire({
                        icon: 'success',
                        title: 'Actualizada',
                        text: 'La maestra ha sido actualizada correctamente',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    bootstrap.Modal.getInstance(document.getElementById('modalMaestra')).hide();
                    cargarMaestras();
                },
                error: function (xhr) {
                    console.error("Error al actualizar:", xhr);
                    Swal.fire("Error", "No se pudo actualizar la maestra", "error");
                }
            });
            return;
        }

        // Modo CREAR
        $.ajax({
            url: API,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(dto),
            success: function () {
                Swal.fire({
                    icon: 'success',
                    title: 'Creada',
                    text: 'La maestra ha sido registrada correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                bootstrap.Modal.getInstance(document.getElementById('modalMaestra')).hide();
                cargarMaestras();
            },
            error: function (xhr) {
                console.error("Error al crear:", xhr);
                Swal.fire("Error", "No se pudo crear la maestra", "error");
            }
        });
    }

    // ============================================================
    // LIMPIAR MODAL
    // ============================================================
    function limpiarModal() {
        $("#IdMaestra").val("");
        $("#Nombre").val("");
        $("#Seccion").val("");
        $("#Activo").prop("checked", true);
    }

    // ============================================================
    // UTILIDADES
    // ============================================================
    function escapeHtml(s) {
        if (s == null) return "";
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function escapeAttr(s) {
        if (s == null) return "";
        return String(s)
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

})();