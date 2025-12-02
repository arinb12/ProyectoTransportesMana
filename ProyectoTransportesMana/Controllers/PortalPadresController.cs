using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ProyectoTransportesMana.Contracts.Estudiantes;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    public class PortalPadresController : Controller
    {
        private readonly IHttpClientFactory _httpFactory;

        public PortalPadresController(IHttpClientFactory httpFactory)
        {
            _httpFactory = httpFactory;
        }

        [HttpGet]
        public IActionResult Index()
        {
            // Aquí va tu dashboard del portal de padres
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GestionHijos()
        {
            var idEncargado = HttpContext.Session.GetInt32("IdUsuario");
            var token = HttpContext.Session.GetString("Token");

            if (idEncargado is null || idEncargado == 0 || string.IsNullOrEmpty(token))
                return RedirectToAction("Index", "Home");

            var client = _httpFactory.CreateClient("Api");
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var resp = await client.GetAsync($"api/v1/estudiantes/por-encargado/{idEncargado}");

            var lista = new List<EstudianteListItemResponse>();

            if (resp.IsSuccessStatusCode)
            {
                var data = await resp.Content.ReadFromJsonAsync<List<EstudianteListItemResponse>>();
                if (data != null)
                    lista = data;
            }

            return View(lista);
        }

        public IActionResult IngresarHijo()
        {
            return View();
        }

        public IActionResult BorrarHijo()
        {
            return View();
        }

        public IActionResult EditarHijo()
        {
            return View();
        }
    }
}
