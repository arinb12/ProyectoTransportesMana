using Microsoft.AspNetCore.Mvc;

namespace ProyectoTransportesMana.Controllers
{
    public class UsuariosController : Controller
    {
        [HttpGet]
        public IActionResult Perfil()
        {
            return View();
        }
    }
}
