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
        ensureSwalReady(function () {
            if (window.Swal && typeof window.Swal.fire === "function") {
                window.Swal.fire({
                    toast: asToast,
                    position: asToast ? "top-end" : "center",
                    icon: opts.icon || "error",
                    title: opts.title || "Error",
                    text: opts.text || "",
                    showConfirmButton: !asToast,
                    timer: asToast ? 2500 : undefined,
                    timerProgressBar: asToast
                });
            } else {
                alert((opts.title || "Aviso") + "\n" + (opts.text || ""));
            }
        });
    }

    window.SwalNotify = SwalNotify;
})();
