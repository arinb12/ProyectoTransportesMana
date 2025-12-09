using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Contracts.Asistencia;
using ProyectoTransportesMana.Contracts.Busetas;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    public class AsistenciaController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public AsistenciaController(IHttpClientFactory httpClientFactory)
            => _httpClientFactory = httpClientFactory;

        [HttpGet]
        public async Task<IActionResult> GestionAsistencia()
        {
            var client = _httpClientFactory.CreateClient("Api");

            var instituciones = await GetOrEmpty<List<InstitucionModel>>(client, "api/v1/instituciones")
                               ?? new List<InstitucionModel>();

            var busetas = await GetOrEmpty<List<BusetaListItemResponse>>(client, "api/v1/busetas/activas")
                           ?? new List<BusetaListItemResponse>();

            ViewBag.Instituciones = instituciones;
            ViewBag.Busetas = busetas;

            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerEstudiantes(int institucionId, int busetaId)
        {
            if (busetaId <= 0)
            {
                return BadRequest(new
                {
                    ok = false,
                    message = "Debe seleccionar una buseta válida."
                });
            }

            var client = _httpClientFactory.CreateClient("Api");

            // 1) Validar que la buseta exista en BD
            var busetaResp = await client.GetAsync($"api/v1/busetas/{busetaId}");
            if (!busetaResp.IsSuccessStatusCode)
            {
                if (busetaResp.StatusCode == HttpStatusCode.NotFound)
                {
                    return NotFound(new
                    {
                        ok = false,
                        message = "La buseta seleccionada no existe en la base de datos."
                    });
                }

                return StatusCode((int)busetaResp.StatusCode, new
                {
                    ok = false,
                    message = "Ocurrió un error al validar la buseta seleccionada."
                });
            }

            // 2) Consultar estudiantes por institución + buseta
            var resp = await client.GetAsync(
                $"api/v1/asistencia/estudiantes?institucionId={institucionId}&busetaId={busetaId}");

            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new
                {
                    ok = false,
                    message = "Ocurrió un error al consultar los estudiantes de la buseta."
                });
            }

            var data = await resp.Content.ReadFromJsonAsync<List<AsistenciaEstudianteListItemResponse>>()
                       ?? new List<AsistenciaEstudianteListItemResponse>();

            return Json(new
            {
                ok = true,
                data
            });
        }

        public sealed record GuardarAsistenciaMvcRequest(
           int IdInstitucion,
           int IdBuseta,
           string TipoViaje,
           List<AsistenciaDetalleItemRequest> Detalles
       );

        [HttpPost]
        public async Task<IActionResult> GuardarAsistencia([FromBody] GuardarAsistenciaMvcRequest model)
        {
            if (model is null)
                return BadRequest(new { ok = false, message = "Datos inválidos." });

            if (model.Detalles is null || model.Detalles.Count == 0)
                return BadRequest(new { ok = false, message = "No hay detalles de asistencia para guardar." });

            var idUsuario = HttpContext.Session.GetInt32("IdUsuario");
            if (idUsuario is null)
            {
                return Unauthorized(new
                {
                    ok = false,
                    message = "La sesión ha expirado. Ingrese de nuevo al sistema."
                });
            }

            var client = _httpClientFactory.CreateClient("Api");

            var payloadApi = new GuardarAsistenciaRequest(
                IdInstitucion: model.IdInstitucion,
                IdBuseta: model.IdBuseta,
                TipoViaje: model.TipoViaje,
                IdUsuarioRegistro: idUsuario.Value,
                Detalles: model.Detalles
            );

            var resp = await client.PostAsJsonAsync("api/v1/asistencia/guardar", payloadApi);

            if (!resp.IsSuccessStatusCode)
            {
                var problem = await SafeReadProblemDetails(resp);
                var msg = problem?.Detail ?? problem?.Title ?? "No se pudo guardar la asistencia.";

                return StatusCode((int)resp.StatusCode, new
                {
                    ok = false,
                    message = msg
                });
            }

            var dataApi = await resp.Content.ReadFromJsonAsync<object>();

            return Json(new
            {
                ok = true,
                data = dataApi
            });
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerEstados(int institucionId, int busetaId, string tipoViaje)
        {
            if (busetaId <= 0 || institucionId <= 0 || string.IsNullOrWhiteSpace(tipoViaje))
            {
                return BadRequest(new
                {
                    ok = false,
                    message = "Parámetros inválidos para obtener la asistencia guardada."
                });
            }

            var client = _httpClientFactory.CreateClient("Api");

            var resp = await client.GetAsync(
                $"api/v1/asistencia/estados?institucionId={institucionId}&busetaId={busetaId}&tipoViaje={tipoViaje}");

            if (!resp.IsSuccessStatusCode)
            {
                return StatusCode((int)resp.StatusCode, new
                {
                    ok = false,
                    message = "Ocurrió un error al consultar la asistencia guardada."
                });
            }

            var data = await resp.Content.ReadFromJsonAsync<List<AsistenciaEstadoResponse>>()
                       ?? new List<AsistenciaEstadoResponse>();

            return Json(new
            {
                ok = true,
                data
            });
        }

        private static async Task<T?> GetOrEmpty<T>(HttpClient client, string url)
        {
            try
            {
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return default;
                return await resp.Content.ReadFromJsonAsync<T>();
            }
            catch
            {
                return default;
            }
        }

        private static async Task<ProblemDetails?> SafeReadProblemDetails(HttpResponseMessage resp)
        {
            try
            {
                return await resp.Content.ReadFromJsonAsync<ProblemDetails>();
            }
            catch
            {
                return null;
            }
        }


    }
}