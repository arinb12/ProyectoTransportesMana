$(function () {

    if (typeof initDataTable === "function") {
        initDataTable('datatablesSimple', [8]);
    }

    
});


function getRequestVerificationToken() {
    const input = document.querySelector('input[name="__RequestVerificationToken"]');
    if (input) return input.value;

    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');

    return null;
}

function eliminarAsistente(id) {
    ensureSwalReady(() => {
        Swal.fire({
            title: "¿Eliminar asistente?",
            text: "Esta acción marcará al asistente como eliminado y no podrá usar el sistema.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (!result.isConfirmed) return;

            fetch(`/Asistente/EliminarAsistente/${id}`, {
                method: "POST",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/json",

                    "RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
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
                            title: data.title || "Asistente eliminado",
                            text: data.message || "El asistente fue eliminado correctamente."
                        }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        SwalNotify("error", data?.title || "Error al eliminar", data?.message || "No se pudo eliminar el asistente.");
                    }
                })
                .catch(() => {
                    SwalNotify("error", "Error", "Ocurrió un error inesperado.");
                });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const tabla = document.getElementById('datatablesSimple');
    if (!tabla) return;


    tabla.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-eliminar');
        if (!btn) return;
        const id = btn.dataset.id;
        if (!id) return;
        eliminarAsistente(id);
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
})();
