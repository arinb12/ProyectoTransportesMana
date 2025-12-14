using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Contracts.EncargadosLegales;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Services;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    public class CuentaController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;

        public CuentaController(IHttpClientFactory httpClientFactory, IConfiguration config, IEmailService emailService)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _emailService = emailService;
        }

        private HttpClient CreateClient()
        {
            var client = _httpClientFactory.CreateClient("Api");

            var token = HttpContext.Session.GetString("Token");
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        [HttpGet]
        public IActionResult PrimerIngreso()
        {
            var idUsuario = HttpContext.Session.GetInt32("IdUsuario");
            if (idUsuario is null || idUsuario == 0)
                return RedirectToAction("Index", "Home");

            var model = new CambiarContrasenaPrimerIngresoModel
            {
                IdUsuario = idUsuario.Value
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> PrimerIngreso(CambiarContrasenaPrimerIngresoModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var client = CreateClient();

            var payload = new
            {
                IdUsuario = model.IdUsuario,
                NuevaContrasena = model.NuevaContrasena,
                AceptoTerminos = model.AceptoTerminos
            };

            var baseUrl = _config["Api:BaseUrl"] ?? string.Empty;
            var urlApi = $"{baseUrl}api/v1/cuenta/primer-ingreso";

            var resp = await client.PostAsJsonAsync(urlApi, payload);

            if (!resp.IsSuccessStatusCode)
            {
                ModelState.AddModelError(string.Empty, "No se pudo actualizar la contraseña.");
                return View(model);
            }

            HttpContext.Session.SetString("AceptoTerminos", "1");
            return RedirectToAction("Index", "PortalPadres");
        }

        [HttpGet]
        public IActionResult CambiarContrasena()
        {
            var idUsuario = HttpContext.Session.GetInt32("IdUsuario");
            if (idUsuario is null || idUsuario == 0)
                return RedirectToAction("Index", "Home");

            var model = new CambiarContrasenaSimpleModel
            {
                IdUsuario = idUsuario.Value
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CambiarContrasena(CambiarContrasenaSimpleModel model)
        {
            var idUsuario = HttpContext.Session.GetInt32("IdUsuario");
            if (idUsuario is null || idUsuario == 0)
                return RedirectToAction("Index", "Home");

            model.IdUsuario = idUsuario.Value;

            if (!ModelState.IsValid)
                return View(model);

            var client = CreateClient();

            var payload = new
            {
                IdUsuario = model.IdUsuario,
                NuevaContrasena = model.NuevaContrasena
            };

            var baseUrl = _config["Api:BaseUrl"] ?? string.Empty;
            var urlApi = $"{baseUrl}api/v1/cuenta/cambiar-contrasena";

            var resp = await client.PostAsJsonAsync(urlApi, payload);

            if (!resp.IsSuccessStatusCode)
            {
                ModelState.AddModelError(string.Empty, "No se pudo cambiar la contraseña.");
                return View(model);
            }

            return RedirectToAction("Principal", "Home");
        }

        [HttpPost]
        public async Task<IActionResult> ResetCredencialesEncargado(int idUsuario)
        {
            if (idUsuario <= 0)
                return BadRequest(new { ok = false, message = "Id de usuario inválido." });

            var client = CreateClient();

            var baseUrl = _config["Api:BaseUrl"] ?? string.Empty;
            var urlReset = $"{baseUrl}api/v1/cuenta/reset-credenciales";

            var respReset = await client.PostAsJsonAsync(urlReset, new { IdUsuario = idUsuario });

            if (!respReset.IsSuccessStatusCode)
                return BadRequest(new { ok = false, message = "No se pudo resetear la contraseña." });

            var data = await respReset.Content.ReadFromJsonAsync<ResetCredencialesResponse>();
            if (data == null || data.Ok != true || string.IsNullOrWhiteSpace(data.TempPassword))
                return BadRequest(new { ok = false, message = "Respuesta inválida del API." });

            var urlUsuario = $"{baseUrl}api/v1/encargados-legales/{idUsuario}";
            var respUser = await client.GetAsync(urlUsuario);

            if (!respUser.IsSuccessStatusCode)
                return BadRequest(new { ok = false, message = "No se pudo obtener el correo del encargado." });

            var encargado = await respUser.Content.ReadFromJsonAsync<EncargadoLegalResponse>();
            if (encargado == null || string.IsNullOrWhiteSpace(encargado.Correo))
                return BadRequest(new { ok = false, message = "El encargado no tiene correo registrado." });

            var asunto = "Recuperación de acceso - Transportes Maná";
            var cuerpoHtml = $@"
<p>Hola {encargado.Nombre} {encargado.PrimerApellido},</p>
<p>Se generó una contraseña temporal para tu cuenta.</p>
<ul>
    <li><strong>Usuario:</strong> {encargado.Correo}</li>
    <li><strong>Contraseña temporal:</strong> {data.TempPassword}</li>
</ul>
<p>Cuando inicies sesión, se te solicitará cambiar la contraseña y aceptar términos y condiciones.</p>
<p>Saludos,<br/>Equipo Transportes Maná</p>";

            await _emailService.EnviarEmailAsync(encargado.Correo, asunto, cuerpoHtml);

            return Ok(new { ok = true, message = "Se envió la contraseña temporal al correo." });
        }

        public sealed class ResetCredencialesResponse
        {
            public bool Ok { get; set; }
            public string TempPassword { get; set; } = string.Empty;
        }

    }
}
