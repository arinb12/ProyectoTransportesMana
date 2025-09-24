using Microsoft.AspNetCore.Mvc;
using Microsoft.VisualBasic;
using ProyectoTransportesMana.Models;
using System.Diagnostics;

namespace ProyectoTransportesMana.Controllers
{
    public class AsistenteController : Controller
    {
        public IActionResult ConsultarAsistente()
        {
            return View();
        }

        public IActionResult RegistrarAsistente(bool openModal = false)
        {
            ViewBag.OpenModal = openModal;
            return View("RegistrarAsistente");
        }


        public IActionResult ActualizarAsistente()
        {
            return View();
        }

        public IActionResult EliminarAsistente()
        {
            return View();
        }
}
}
