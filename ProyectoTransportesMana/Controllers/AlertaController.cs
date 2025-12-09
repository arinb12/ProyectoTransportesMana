using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad] // si usas este filtro como en AsistenteController
    public class AlertaController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        public AlertaController(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

        // GET: /Alerta/ConsultarAlerta
        public IActionResult ConsultarAlerta()
        {
            int currentUserId = HttpContext.Session.GetInt32("IdUsuario") ?? 0;
            ViewData["CurrentUserId"] = currentUserId;
            return View();
        }

        // GET: /Alerta/RegistrarAlerta
        // openModal = true si quieres abrir el modal al cargar la vista (misma idea que AsistenteController)
        [HttpGet]
        public async Task<IActionResult> RegistrarAlerta(bool openModal = false)
        {
            var model = new CrearAlertaViewModel
            {
                FechaPublicacion = DateTime.Now,
                EnviadoPor = GetCurrentUserId(), // opcional, para autocompletar
                BusetasSelectList = await GetBusetasSelectList(),
                EncargadosSelectList = await GetEncargadosSelectList()
            };

            ViewBag.OpenModal = openModal;
            return View("RegistrarAlerta", model);
        }

        // POST: /Alerta/RegistrarAlerta
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegistrarAlerta(CrearAlertaViewModel model)
        {
            if (!ModelState.IsValid)
            {
                // recargar selects si falla validación
                model.BusetasSelectList = await GetBusetasSelectList();
                model.EncargadosSelectList = await GetEncargadosSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAlerta", model);
            }

            var cliente = _httpClientFactory.CreateClient("Api");

            // payload que espera la API (CrearAlertaDto)
            var payload = new
            {
                EnviadoPor = model.EnviadoPor,
                Titulo = model.Titulo,
                TipoAlerta = model.TipoAlerta,
                Mensaje = model.Mensaje,
                PublicoDestino = model.PublicoDestino,
                FechaPublicacion = model.FechaPublicacion
            };

            var resp = await cliente.PostAsJsonAsync("api/alerta", payload);

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await resp.Content.ReadAsStringAsync();
                ModelState.AddModelError(string.Empty, $"Error al guardar: {msg}");
                model.BusetasSelectList = await GetBusetasSelectList();
                model.EncargadosSelectList = await GetEncargadosSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAlerta", model);
            }

            // redirige a listado / consultar
            return RedirectToAction("ConsultarAlerta");
        }

        // GET: /Alerta/GetAlertasParaUsuario (proxy que llama a la API)
        [HttpGet]
        public async Task<IActionResult> GetAlertasParaUsuario()
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Json(new { ok = false, message = "Usuario no autenticado" });

            try
            {
                var cliente = _httpClientFactory.CreateClient("Api");
                var url = $"api/alerta/user/{userId}/today";
                var lista = await cliente.GetFromJsonAsync<List<CrearAlertaDto>>(url);
                return Json(lista ?? new List<CrearAlertaDto>());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = "Error al consultar alertas.", detail = ex.Message });
            }
        }

        // GET: /Alerta/GetCountAlertasParaUsuario
        [HttpGet]
        public async Task<IActionResult> GetCountAlertasParaUsuario()
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Json(new { ok = false, count = 0 });

            try
            {
                var cliente = _httpClientFactory.CreateClient("Api");
                // Llamamos al nuevo endpoint del API que cuenta solo NO-LEIDAS
                var url = $"api/alerta/user/{userId}/count-real";
                var resp = await cliente.GetAsync(url);

                var txt = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                    return StatusCode((int)resp.StatusCode, txt);

                // devolver el JSON tal cual para que el layout lo consuma
                return Content(txt, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, count = 0, message = "Error conteo alertas", detail = ex.Message });
            }
        }

        // POST: /Alerta/MarcarAlertasComoLeidas
        [HttpPost]
        public async Task<IActionResult> MarcarAlertasComoLeidas()
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return Json(new { ok = false });

            try
            {
                var cliente = _httpClientFactory.CreateClient("Api");
                var url = $"api/alerta/user/{userId}/marcar-leidas";
                var resp = await cliente.PostAsync(url, null);

                if (!resp.IsSuccessStatusCode)
                {
                    var txt = await resp.Content.ReadAsStringAsync();
                    return StatusCode((int)resp.StatusCode, txt);
                }

                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = "Error marcando alertas", detail = ex.Message });
            }
        }


        #region Helpers para selects (busetas / encargados)

        // Busetas: usa el endpoint de Asistente api/Asistente/Busetas (tal como tu API ya expone)
        private async Task<IEnumerable<SelectListItem>> GetBusetasSelectList()
        {
            try
            {
                var cliente = _httpClientFactory.CreateClient("Api");
                var lista = await cliente.GetFromJsonAsync<List<BusetaLookupVm>>("api/Asistente/Busetas") ?? new();
                return lista.Select(b => new SelectListItem { Value = b.Id.ToString(), Text = b.Texto });
            }
            catch
            {
                return Enumerable.Empty<SelectListItem>();
            }
        }

        // Encargados: intenta llamar a un endpoint que devuelva encargados (ver nota abajo)
        private async Task<IEnumerable<SelectListItem>> GetEncargadosSelectList()
        {
            try
            {
                var cliente = _httpClientFactory.CreateClient("Api");
                // Ajusta esta ruta si tu API tiene otro controller/route para encargados legales.
                // En tu BD existe sp_encargados_legales_lookup -> crea un endpoint API si no existe.
                var lista = await cliente.GetFromJsonAsync<List<EncargadoLookupVm>>("api/Encargado/Lookup")
                            ?? new List<EncargadoLookupVm>();

                return lista.Select(e => new SelectListItem { Value = e.IdUsuario.ToString(), Text = e.NombreCompleto });
            }
            catch
            {
                // si el endpoint no existe, devolvemos vacío (la vista seguirá mostrando "Todos")
                return Enumerable.Empty<SelectListItem>();
            }
        }

        private class BusetaLookupVm
        {
            public int Id { get; set; }
            public string Texto { get; set; } = string.Empty;
        }

        private class EncargadoLookupVm
        {
            public int IdUsuario { get; set; }
            public string NombreCompleto { get; set; } = string.Empty;
        }

        #endregion

        #region Helpers & GetCurrentUserId

        private int GetCurrentUserId()
        {
            try
            {
                var idFromSession = HttpContext.Session.GetInt32("IdUsuario");
                if (idFromSession.HasValue) return idFromSession.Value;
            }
            catch { /* session no configurada */ }

            var claim = User?.FindFirst("id_usuario")?.Value
                        ?? User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return 0;
        }

        #endregion
    }
}
