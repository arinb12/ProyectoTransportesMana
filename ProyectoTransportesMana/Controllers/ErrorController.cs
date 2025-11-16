using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ProyectoTransportesMana.Controllers
{
    public class ErrorController : Controller
    {
        [Route("Error/MostrarError")]
        public IActionResult MostrarError()
        {
            var exception = HttpContext.Features.Get<IExceptionHandlerFeature>();
            return View("MostrarError");
        }
    }
}
