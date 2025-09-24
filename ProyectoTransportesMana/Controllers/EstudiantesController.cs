using Microsoft.AspNetCore.Mvc;

namespace ProyectoTransportesMana.Controllers
{
    public class EstudiantesController : Controller
    {
        public IActionResult GestionEstudiantes()
        {
            return View();
        }
    }
}
