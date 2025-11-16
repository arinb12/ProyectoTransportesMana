using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    public class AsistenteController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        public AsistenteController(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

        [HttpGet]
        public async Task<IActionResult> ConsultarAsistente()
        {
            var cliente = _httpClientFactory.CreateClient("Api");

            List<AsistenteListado>? lista;
            try
            {
                lista = await cliente.GetFromJsonAsync<List<AsistenteListado>>("api/Asistente/Listar");
            }
            catch
            {
                lista = new List<AsistenteListado>();
                TempData["Error"] = "No se pudo cargar el listado de asistentes.";
            }

            return View(lista);
        }


        [HttpGet]
        public async Task<IActionResult> RegistrarAsistente(bool openModal = false)
        {
            var model = new AsistenteModel
            {
                Activo = true,
                BusetasSelectList = await GetBusetasSelectList()
            };

            ViewBag.OpenModal = openModal;
            return View("RegistrarAsistente", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegistrarAsistente(AsistenteModel model)
        {
            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            var cliente = _httpClientFactory.CreateClient("Api");

            var payload = new
            {
                Id = model.Id,
                Nombre = model.Nombre,
                PrimerApellido = model.PrimerApellido,
                SegundoApellido = model.SegundoApellido,
                Telefono = model.Telefono,
                Cedula = model.Cedula,
                Correo = model.Correo,
                Salario = model.Salario,
                BusetaId = model.BusetaId,
                Activo = model.Activo
            };

            var resp = await cliente.PostAsJsonAsync("api/Asistente/RegistrarAsistente", payload);

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await resp.Content.ReadAsStringAsync();
                ModelState.AddModelError(string.Empty, $"Error al guardar: {msg}");
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            return RedirectToAction("ConsultarAsistente");
        }


        private async Task<IEnumerable<SelectListItem>> GetBusetasSelectList()
        {
            var cliente = _httpClientFactory.CreateClient("Api");
            var lista = await cliente.GetFromJsonAsync<List<BusetaVm>>("api/Asistente/Busetas") ?? new();
            return lista.Select(b => new SelectListItem { Value = b.Id.ToString(), Text = b.Texto });
        }

 
        private class BusetaVm
        {
            public int Id { get; set; }
            public string Texto { get; set; } = string.Empty;
        }




        [HttpGet]
        public async Task<IActionResult> ActualizarAsistente(int id, bool openModal = false)
        {
            var api = _httpClientFactory.CreateClient("Api");

            var detalle = await api.GetFromJsonAsync<AsistenteResponse>($"api/Asistente/{id}");
            if (detalle is null)
            {
                TempData["Error"] = "No se encontró el asistente.";
                return RedirectToAction("ConsultarAsistente");
            }

            var model = new AsistenteModel
            {
                Id = detalle.Id,
                Nombre = detalle.Nombre,
                PrimerApellido = detalle.PrimerApellido,
                SegundoApellido = detalle.SegundoApellido ?? "",
                Telefono = detalle.Telefono,
                Cedula = detalle.Cedula,
                Correo = detalle.Correo,
                Salario = detalle.Salario,     
                BusetaId = detalle.BusetaId,
                Activo = detalle.Activo,
                BusetasSelectList = await GetBusetasSelectList()
            };

            ViewBag.OpenModal = openModal;
            return View("ActualizarAsistente", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ActualizarAsistente(AsistenteModel model)
        {
            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("ActualizarAsistente", model);
            }

            var api = _httpClientFactory.CreateClient("Api");

            var payload = new
            {
                Id = model.Id!.Value,
                Nombre = model.Nombre,
                PrimerApellido = model.PrimerApellido,
                SegundoApellido = string.IsNullOrWhiteSpace(model.SegundoApellido) ? null : model.SegundoApellido,
                Activo = model.Activo,
                Telefono = model.Telefono,
                Cedula = model.Cedula,
                Correo = model.Correo,
                Salario = model.Salario,        
                BusetaId = model.BusetaId!.Value
            };

            var resp = await api.PutAsJsonAsync($"api/Asistente/{model.Id}", payload);

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await resp.Content.ReadAsStringAsync();
                ModelState.AddModelError(string.Empty, $"Error al actualizar: {msg}");
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("ActualizarAsistente", model);
            }

            return RedirectToAction("ConsultarAsistente");
        }
        [HttpPost]
        public async Task<IActionResult> EliminarAsistente(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var resp = await client.DeleteAsync($"api/v1/asistentes/{id}");


            if (resp.IsSuccessStatusCode)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Ok(new
                    {
                        ok = true,
                        title = "Asistente eliminado",
                        message = "El asistente fue eliminado correctamente."
                    });
                }

                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Asistente eliminado";
                TempData["SwalText"] = "El asistente fue eliminado correctamente.";
                return RedirectToAction(nameof(ConsultarAsistente));
            }


            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return BadRequest(new
                {
                    ok = false,
                    title = "Error al eliminar",
                    message = "No se pudo eliminar el asistente."
                });
            }


            TempData["SwalType"] = "error";
            TempData["SwalTitle"] = "Error al eliminar";
            TempData["SwalText"] = "No se pudo eliminar el asistente.";
            return RedirectToAction(nameof(ConsultarAsistente));
        }
    }
}