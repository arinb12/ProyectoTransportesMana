using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;

namespace ProyectoTransportesMana.Controllers
{
    public class GestionMaestrasController : Controller
    {
        public IActionResult Maestras()
        {
            return View();
        }
    }
}