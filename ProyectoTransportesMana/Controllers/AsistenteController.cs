using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using ProyectoTransportesMana.Services;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    public class AsistenteController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public AsistenteController(IHttpClientFactory httpClientFactory, IEmailService emailService, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _emailService = emailService;
            _config = config;
        }

        private bool EsAdmin()
        {
            var rol = HttpContext.Session.GetInt32("IdRol");
            return rol.HasValue && rol.Value == 1;
        }

        private IActionResult BloquearSiNoEsAdmin()
        {
            if (EsAdmin()) return null!;
            return RedirectToAction("Principal", "Home");
        }

        private HttpClient CreateClient()
            => _httpClientFactory.CreateClient("Api");

        private string GetClaveFijaAsistente()
            => _config["Valores:ClaveFijaAsistente"] ?? string.Empty;

        [HttpGet]
        public async Task<IActionResult> ConsultarAsistente()
        {
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            var cliente = CreateClient();

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
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

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
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            var claveFija = GetClaveFijaAsistente();
            if (string.IsNullOrWhiteSpace(claveFija))
            {
                ModelState.AddModelError(string.Empty, "No está configurada la contraseña temporal fija para asistentes.");
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            var client = CreateClient();

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

            var resp = await client.PostAsJsonAsync("api/Asistente/RegistrarAsistente", payload);

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await resp.Content.ReadAsStringAsync();
                ModelState.AddModelError(string.Empty, $"Error al guardar: {msg}");
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("RegistrarAsistente", model);
            }

            var asunto = "Credenciales de acceso - Transportes Maná (Asistente)";
            var cuerpoHtml = $@"
<p>Hola {model.Nombre} {model.PrimerApellido},</p>
<p>Tu cuenta de <strong>Asistente</strong> fue creada en <strong>Transportes Maná</strong>.</p>
<p>Datos de acceso:</p>
<ul>
    <li><strong>Usuario:</strong> {model.Correo}</li>
    <li><strong>Contraseña temporal:</strong> {claveFija}</li>
</ul>
<p>Por seguridad, inicia sesión y cambia tu contraseña en el primer ingreso.</p>
<p>Saludos cordiales,<br>Equipo Transportes Maná</p>";

            try
            {
                if (!string.IsNullOrWhiteSpace(model.Correo))
                    await _emailService.EnviarEmailAsync(model.Correo!, asunto, cuerpoHtml);

                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Asistente registrado";
                TempData["SwalText"] = "Se envió un correo con su contraseña temporal.";
            }
            catch
            {
                TempData["SwalType"] = "warning";
                TempData["SwalTitle"] = "Asistente registrado";
                TempData["SwalText"] = "El usuario se creó, pero no se pudo enviar el correo de bienvenida.";
            }

            return RedirectToAction(nameof(ConsultarAsistente));
        }

        [HttpGet]
        public async Task<IActionResult> ActualizarAsistente(int id, bool openModal = false)
        {
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            var api = CreateClient();

            var detalle = await api.GetFromJsonAsync<AsistenteResponse>($"api/Asistente/{id}");
            if (detalle is null)
            {
                TempData["Error"] = "No se encontró el asistente.";
                return RedirectToAction(nameof(ConsultarAsistente));
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
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            if (!ModelState.IsValid)
            {
                model.BusetasSelectList = await GetBusetasSelectList();
                ViewBag.OpenModal = true;
                return View("ActualizarAsistente", model);
            }

            var api = CreateClient();

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

            return RedirectToAction(nameof(ConsultarAsistente));
        }

        [HttpPost]
        public async Task<IActionResult> EliminarAsistente(int id)
        {
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            var client = CreateClient();
            var resp = await client.DeleteAsync($"api/asistente/{id}");

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

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ReenviarCredenciales(int id)
        {
            var deny = BloquearSiNoEsAdmin();
            if (deny != null) return deny;

            var claveFija = GetClaveFijaAsistente();
            if (string.IsNullOrWhiteSpace(claveFija))
                return BadRequest(new { ok = false, message = "No está configurada la contraseña temporal fija." });

            var client = CreateClient();

            var detalle = await client.GetFromJsonAsync<AsistenteResponse>($"api/Asistente/{id}");
            if (detalle is null || string.IsNullOrWhiteSpace(detalle.Correo))
                return BadRequest(new { ok = false, message = "No se encontró el asistente o no tiene correo." });

            var resp = await client.PostAsJsonAsync($"api/Asistente/{id}/Credenciales", new
            {
                Contrasena = claveFija
            });

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await resp.Content.ReadAsStringAsync();
                return StatusCode((int)resp.StatusCode, new { ok = false, message = msg });
            }

            var asunto = "Reenvío de credenciales - Transportes Maná (Asistente)";
            var cuerpoHtml = $@"
<p>Hola {detalle.Nombre} {detalle.PrimerApellido},</p>
<p>Se restableció la <strong>contraseña temporal</strong> para tu cuenta de Asistente.</p>
<ul>
    <li><strong>Usuario:</strong> {detalle.Correo}</li>
    <li><strong>Contraseña temporal:</strong> {claveFija}</li>
</ul>
<p>Por seguridad, inicia sesión y cambia tu contraseña.</p>
<p>Saludos cordiales,<br>Equipo Transportes Maná</p>";

            try
            {
                await _emailService.EnviarEmailAsync(detalle.Correo!, asunto, cuerpoHtml);
            }
            catch
            {
                return Ok(new { ok = true, warning = true, message = "Se restableció la contraseña, pero no se pudo enviar el correo." });
            }

            return Ok(new { ok = true, message = "Credenciales enviadas correctamente." });
        }

        private async Task<IEnumerable<SelectListItem>> GetBusetasSelectList()
        {
            var cliente = CreateClient();
            var lista = await cliente.GetFromJsonAsync<List<BusetaVm>>("api/Asistente/Busetas") ?? new();
            return lista.Select(b => new SelectListItem { Value = b.Id.ToString(), Text = b.Texto });
        }

        private class BusetaVm
        {
            public int Id { get; set; }
            public string Texto { get; set; } = string.Empty;
        }
    }
}
