using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ProyectoTransportesMana.Contracts.Estudiantes;
using ProyectoTransportesMana.Models;
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

        private HttpClient CreateClient()
        {
            var client = _httpFactory.CreateClient("Api");

            var token = HttpContext.Session.GetString("Token");
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var idEncargado = HttpContext.Session.GetInt32("IdUsuario");
            var token = HttpContext.Session.GetString("Token");

            if (idEncargado is null || idEncargado == 0 || string.IsNullOrEmpty(token))
                return RedirectToAction("Index", "Home");

            var client = CreateClient();

            // 1) Obtener hijos del padre
            var respHijos = await client.GetAsync($"api/v1/estudiantes/por-encargado/{idEncargado}");

            var hijosApi = new List<EstudianteListItemResponse>();

            if (respHijos.IsSuccessStatusCode)
            {
                var data = await respHijos.Content.ReadFromJsonAsync<List<EstudianteListItemResponse>>();
                if (data != null)
                    hijosApi = data;
            }

            var model = new PortalPadresViewModel();

            // 2) Si hay al menos un hijo, consultamos su detalle de transporte
            if (hijosApi.Any())
            {
                var primerHijo = hijosApi.First();

                var respDetalle = await client.GetAsync($"api/v1/estudiantes/{primerHijo.Id}/detalle-transporte");

                if (respDetalle.IsSuccessStatusCode)
                {
                    var detalle = await respDetalle.Content.ReadFromJsonAsync<EstudianteTransporteDetalleResponse>();

                    if (detalle != null)
                    {
                        // Conductor
                        if (!string.IsNullOrWhiteSpace(detalle.ConductorNombre))
                        {
                            model.Conductor = new PersonaSimpleModel
                            {
                                Id = detalle.IdBuseta ?? 0, 
                                NombreCompleto = detalle.ConductorNombre,
                               
                                Telefono = detalle.ConductorCedula
                            };
                        }


                        if (detalle.IdAsistente.HasValue)
                        {
                            model.Ayudante = new PersonaSimpleModel
                            {
                                Id = detalle.IdAsistente.Value,
                                NombreCompleto = detalle.AsistenteNombre, // ← el nombre real del asistente
                                Telefono = detalle.AsistenteTelefono
                            };
                        }


                    }
                }
            }

            
            foreach (var h in hijosApi)
            {
                model.Hijos.Add(new HijoHorarioViewModel
                {
                    IdEstudiante = h.Id,
                    NombreEstudiante = h.NombreCompletoEstudiante,
                    Institucion = h.Institucion ?? string.Empty,
                    CambiosHorario = new List<CambioHorarioViewModel>()
                    
                });
            }

            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> GestionHijos()
        {
            var idEncargado = HttpContext.Session.GetInt32("IdUsuario");
            var token = HttpContext.Session.GetString("Token");

            if (idEncargado is null || idEncargado == 0 || string.IsNullOrEmpty(token))
                return RedirectToAction("Index", "Home");

            var client = CreateClient();

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
