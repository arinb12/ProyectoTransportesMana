using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using ProyectoTransportesMana.Contracts.Estudiantes;
using ProyectoTransportesMana.Contracts.Horarios;
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

            var respHijos = await client.GetAsync($"api/v1/estudiantes/por-encargado/{idEncargado}");

            var hijosApi = new List<EstudianteListItemResponse>();

            if (respHijos.IsSuccessStatusCode)
            {
                var data = await respHijos.Content.ReadFromJsonAsync<List<EstudianteListItemResponse>>();
                if (data != null)
                    hijosApi = data;
            }

            var model = new PortalPadresViewModel();

            if (hijosApi.Any())
            {
                var primerHijo = hijosApi.First();

                var respDetalle = await client.GetAsync($"api/v1/estudiantes/{primerHijo.Id}/detalle-transporte");

                if (respDetalle.IsSuccessStatusCode)
                {
                    var detalle = await respDetalle.Content.ReadFromJsonAsync<EstudianteTransporteDetalleResponse>();

                    if (detalle != null)
                    {
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
                                NombreCompleto = detalle.AsistenteNombre,
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
                    CambiosHorario = new List<CambioHorarioViewModel>(),
                    HorarioAnual = new List<HorarioDiaViewModel>()
                });
            }

            var clientHorarios = CreateClient();

            foreach (var hijo in model.Hijos)
            {
                var respHorario = await clientHorarios.GetAsync($"api/v1/horarios/por-estudiante/{hijo.IdEstudiante}");
                var horarioApi = new List<HorarioListItemResponse>();

                if (respHorario.IsSuccessStatusCode)
                {
                    var data = await respHorario.Content.ReadFromJsonAsync<List<HorarioListItemResponse>>();
                    if (data != null)
                        horarioApi = data;
                }

                for (int dia = 1; dia <= 5; dia++)
                {
                    string nombreDia = dia switch
                    {
                        1 => "Lunes",
                        2 => "Martes",
                        3 => "Miércoles",
                        4 => "Jueves",
                        5 => "Viernes",
                        _ => ""
                    };

                    var existente = horarioApi.FirstOrDefault(x => x.DiaSemana == nombreDia);

                    hijo.HorarioAnual.Add(new HorarioDiaViewModel
                    {
                        IdHorario = existente?.IdHorario ?? 0,
                        DiaSemana = dia,
                        HoraEntrada = existente?.HoraEntrada,
                        HoraSalida = existente?.HoraSalida
                    });
                }
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

        [HttpGet]
        public async Task<IActionResult> EditarHorario(int idEstudiante)
        {
            var idEncargado = HttpContext.Session.GetInt32("IdUsuario");
            var token = HttpContext.Session.GetString("Token");

            if (idEncargado is null || idEncargado == 0 || string.IsNullOrEmpty(token))
                return RedirectToAction("Index", "Home");

            var client = CreateClient();

            var respEst = await client.GetAsync($"api/v1/estudiantes/{idEstudiante}");
            if (!respEst.IsSuccessStatusCode)
                return RedirectToAction("GestionHijos");

            var est = await respEst.Content.ReadFromJsonAsync<EstudianteResponse>();

            var respHorario = await client.GetAsync($"api/v1/horarios/por-estudiante/{idEstudiante}");
            var horarioApi = new List<HorarioListItemResponse>();

            if (respHorario.IsSuccessStatusCode)
            {
                var data = await respHorario.Content.ReadFromJsonAsync<List<HorarioListItemResponse>>();
                if (data != null)
                    horarioApi = data;
            }

            var model = new EditarHorarioEstudianteViewModel
            {
                IdEstudiante = idEstudiante,
                NombreEstudiante = est?.Nombre ?? string.Empty,
                Institucion = est?.Seccion ?? string.Empty
            };

            for (int dia = 1; dia <= 5; dia++)
            {
                string nombreDia = dia switch
                {
                    1 => "Lunes",
                    2 => "Martes",
                    3 => "Miércoles",
                    4 => "Jueves",
                    5 => "Viernes",
                    _ => ""
                };

                var existente = horarioApi.FirstOrDefault(x => x.DiaSemana == nombreDia);

                model.Horario.Add(new HorarioDiaViewModel
                {
                    IdHorario = existente?.IdHorario ?? 0,
                    DiaSemana = dia,
                    HoraEntrada = existente?.HoraEntrada,
                    HoraSalida = existente?.HoraSalida
                });
            }


            return PartialView("_EditarHorarioModal", model);
        }

        [HttpPost]
        public async Task<IActionResult> EditarHorario(EditarHorarioEstudianteViewModel model)
        {
            var idEncargado = HttpContext.Session.GetInt32("IdUsuario");
            var token = HttpContext.Session.GetString("Token");

            if (idEncargado is null || idEncargado == 0 || string.IsNullOrEmpty(token))
                return Unauthorized(new { ok = false, message = "Sesión no válida" });

            var client = CreateClient();

            foreach (var h in model.Horario)
            {
                string nombreDia = h.DiaSemana switch
                {
                    1 => "Lunes",
                    2 => "Martes",
                    3 => "Miércoles",
                    4 => "Jueves",
                    5 => "Viernes",
                    6 => "Sábado",
                    7 => "Domingo",
                    _ => ""
                };

                var dto = new
                {
                    IdHorario = h.IdHorario == 0 ? (int?)null : h.IdHorario,
                    IdEstudiante = model.IdEstudiante,
                    DiaSemana = nombreDia,
                    HoraEntrada = h.HoraEntrada?.ToString(@"hh\:mm"),
                    HoraSalida = h.HoraSalida?.ToString(@"hh\:mm")
                };

                var resp = await client.PutAsJsonAsync("api/v1/horarios", dto);
                if (!resp.IsSuccessStatusCode)
                    return StatusCode(StatusCodes.Status500InternalServerError, new { ok = false, message = "Error guardando horario" });
            }

            return Ok(new { ok = true });


        }



    }
}
