using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    public class CuentaController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public CuentaController(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
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
            {
                return RedirectToAction("Index", "Home");
            }

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
            {
                return View(model);
            }

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
                ModelState.AddModelError(string.Empty, "No se pudo actualizar la contraseña. Intente de nuevo.");
                return View(model);
            }

            HttpContext.Session.SetString("AceptoTerminos", "1");

            return RedirectToAction("Index", "PortalPadres");
        }
    }
}
