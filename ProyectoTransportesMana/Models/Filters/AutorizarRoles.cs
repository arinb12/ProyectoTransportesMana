using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace ProyectoTransportesMana.Models.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
    public class AutorizarRoles : ActionFilterAttribute
    {
        private readonly int[] _rolesPermitidos;

        public AutorizarRoles(params int[] rolesPermitidos)
        {
            _rolesPermitidos = rolesPermitidos ?? Array.Empty<int>();
        }

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            if (_rolesPermitidos.Length == 0)
            {
                base.OnActionExecuting(context);
                return;
            }

            var http = context.HttpContext;
            var rol = http.Session.GetInt32("IdRol");

            if (rol == null || !_rolesPermitidos.Contains(rol.Value))
            {
                bool isAjax =
                    string.Equals(http.Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase) ||
                    (http.Request.Headers["Accept"].ToString()?.Contains("application/json", StringComparison.OrdinalIgnoreCase) ?? false);

                if (isAjax)
                {
                    context.Result = new JsonResult(new
                    {
                        ok = false,
                        title = "Acceso denegado",
                        message = "No tienes permisos para acceder a esta funcionalidad."
                    })
                    { StatusCode = StatusCodes.Status403Forbidden };

                    return;
                }

                // Para navegación normal: Redirigir a una página de "Acceso Denegado"
                // o Home/Principal.
                // TODO CREAR PÁGINA DE ACCESO DENEGADO
                context.Result = new RedirectToActionResult("Principal", "Home", null);
                return;
            }

            base.OnActionExecuting(context);
        }
    }
}
