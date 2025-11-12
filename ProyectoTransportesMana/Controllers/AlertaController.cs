using Microsoft.AspNetCore.Mvc;

namespace ProyectoTransportesMana.Controllers
{
    public class AlertaController : Controller
    {
        public IActionResult ConsultarAlerta()
        {
            return View();
        }

        public IActionResult RegistrarAlerta()
        {
            return View();
        }
        public IActionResult EliminarAlerta()
        {
            return View();
        }
    }
}
