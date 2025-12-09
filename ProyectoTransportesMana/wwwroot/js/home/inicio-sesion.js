$(function () {
    $("#FormInicioSesion").validate({
        rules: {
            Correo: {
                required: true
            },
            ContrasenaHash: {
                required: true
            },
        },
        messages: {
            Correo: {
                required: "* Requerido"
            },
            ContrasenaHash: {
                required: "* Requerido"
            }
        }
    });
});