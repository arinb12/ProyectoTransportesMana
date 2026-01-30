$(function () {
    // jQuery Validate configuration
    $("#FormInicioSesion").validate({
        rules: {
            Correo: {
                required: true,
                email: true
            },
            ContrasenaHash: {
                required: true,
                minlength: 1
            }
        },
        messages: {
            Correo: {
                required: "El correo electrónico es requerido",
                email: "Ingresa un correo electrónico válido"
            },
            ContrasenaHash: {
                required: "La contraseña es requerida"
            }
        },
        errorElement: "span",
        errorClass: "error",
        validClass: "valid",
        errorPlacement: function (error, element) {
            error.insertAfter(element.closest(".form-floating-custom"));
        },
        highlight: function (element) {
            $(element)
                .addClass("error")
                .removeClass("valid")
                .closest(".form-floating-custom")
                .find(".input-icon")
                .css("color", "var(--login-danger)");
        },
        unhighlight: function (element) {
            $(element)
                .removeClass("error")
                .addClass("valid")
                .closest(".form-floating-custom")
                .find(".input-icon")
                .css("color", "");
        },
        submitHandler: function (form) {
            const $btn = $(form).find(".btn-login");

            $btn.prop("disabled", true)
                .html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Iniciando...');

            form.submit();
        }
    });

    // Password visibility toggle - Fixed version
    $(document).on("click", ".password-toggle", function (e) {
        e.preventDefault();

        const $wrapper = $(this).closest(".form-floating-custom");
        const $input = $wrapper.find("input[type='password'], input[type='text']");
        const $icon = $(this).find("i");

        if ($input.attr("type") === "password") {
            $input.attr("type", "text");
            $icon.removeClass("bi-eye").addClass("bi-eye-slash");
        } else {
            $input.attr("type", "password");
            $icon.removeClass("bi-eye-slash").addClass("bi-eye");
        }
    });

    // Add focus effect to input wrappers
    $(".form-input").on("focus", function () {
        $(this).closest(".form-floating-custom").addClass("focused");
    }).on("blur", function () {
        $(this).closest(".form-floating-custom").removeClass("focused");
    });
});