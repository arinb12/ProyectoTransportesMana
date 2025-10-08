using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.VisualBasic;
using ProyectoTransportesMana.Models;
using System.Diagnostics;

namespace ProyectoTransportesMana.Controllers
{
    public class AsistenteController : Controller
    {

        [HttpGet]
        public IActionResult ConsultarAsistente()
        {
            return View();
        }

        [HttpGet]
        public IActionResult RegistrarAsistente(bool openModal = false)
        {
            // Simulación catálogo; reemplaza por tu servicio/DB
            var busetas = new List<SelectListItem>
            {
                new SelectListItem { Value = "1", Text = "Buseta 1 - ABC123" },
                new SelectListItem { Value = "2", Text = "Buseta 2 - DEF456" },
                new SelectListItem { Value = "3", Text = "Buseta 3 - GHI789" },
            };

            var model = new AsistenteModel
            {
                BusetasSelectList = busetas,
                Activo = true
            };

            ViewBag.OpenModal = openModal;
            return View("RegistrarAsistente", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult RegistrarAsistente(AsistenteModel model)
        {
            // Si falló validación, reponemos el SelectList y mantenemos el modal abierto
            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = new List<SelectListItem>
                {
                    new SelectListItem { Value = "1", Text = "Buseta 1 - ABC123" },
                    new SelectListItem { Value = "2", Text = "Buseta 2 - DEF456" },
                    new SelectListItem { Value = "3", Text = "Buseta 3 - GHI789" },
                };

                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            // TODO: guardar en BD...
            return RedirectToAction("ConsultarAsistente");
        }

        [HttpGet]
        public IActionResult ActualizarAsistente(int id, bool openModal = false)
        {
            // TODO: Obtener de BD por id. Mock de ejemplo:
            var model = new AsistenteModel
            {
                Id = id,
                Nombre = "Sonia Rodríguez",
                Telefono = "88113322",
                Cedula = "123456789",
                Correo = "ssro@gmail.com",
                Salario = 5000m,
                BusetaId = 2,
                Activo = true,
                BusetasSelectList = CatalogoBusetas()
            };

            ViewBag.OpenModal = openModal;
            return View("ActualizarAsistente", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ActualizarAsistente(AsistenteModel model)
        {
            // (Sin validaciones de cliente; aquí puedes validar servidor si quieres)
            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = CatalogoBusetas();
                ViewBag.OpenModal = true;
                return View("ActualizarAsistente", model);
            }

            // TODO: Actualizar en BD...
            return RedirectToAction("ConsultarAsistente");
        }


        [HttpGet]
        public IActionResult EliminarAsistente(int id, bool openModal = false)
        {
            // (Opcional) podrías buscar el nombre por id para mostrarlo en el modal.
            // Por ahora lo dejamos genérico.
            ViewBag.AsistenteId = id;
            ViewBag.OpenModal = openModal;
            return View("EliminarAsistente");
        }

        // Utilidad para poblar el select
        private static List<SelectListItem> CatalogoBusetas() => new()
        {
            new SelectListItem { Value = "1", Text = "Buseta 1 - ABC123" },
            new SelectListItem { Value = "2", Text = "Buseta 2 - DEF456" },
            new SelectListItem { Value = "3", Text = "Buseta 3 - GHI789" },
        };
    }
}
