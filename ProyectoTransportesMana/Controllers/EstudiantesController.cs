using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;

namespace ProyectoTransportesMana.Controllers
{
    public class EstudiantesController : Controller
    {
        [HttpGet]
        public IActionResult GestionEstudiantes()
        {
            return View();
        }

        [HttpPost]
        public IActionResult RegistrarEstudiante(EstudianteModel estudiante)
        {
            if (ModelState.IsValid)
            {
                // Guardar el estudiante en la base de datos
                return RedirectToAction("GestionEstudiantes");
            }
            return View(estudiante);
        }
    }
}
