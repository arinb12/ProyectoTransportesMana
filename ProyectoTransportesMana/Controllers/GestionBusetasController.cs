using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using ProyectoTransportesMana.Contracts.Busetas;
using ProyectoTransportesMana.Models.Filters;
using System.Text;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    [AutorizarRoles(1)]
    public class GestionBusetasController : Controller
    {
        private readonly HttpClient _http;

        public GestionBusetasController(IHttpClientFactory factory)
        {
            _http = factory.CreateClient("Api");
        }

        [HttpGet]
        public IActionResult Busetas()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var res = await _http.GetAsync("api/v1/busetas");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var res = await _http.GetAsync($"api/v1/busetas/{id}");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> ConAsignaciones()
        {
            var res = await _http.GetAsync("api/v1/busetas/con-asignaciones");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] BusetaCreateRequest req)
        {
            var body = JsonConvert.SerializeObject(req);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var res = await _http.PostAsync("api/v1/busetas", content);
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar(int id, [FromBody] BusetaUpdateRequest req)
        {
            if (id != req.Id)
                return BadRequest("ID no coincide");

            var body = JsonConvert.SerializeObject(req);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var res = await _http.PutAsync($"api/v1/busetas/{id}", content);

            if (!res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                return StatusCode((int)res.StatusCode, json);
            }

            return NoContent();
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var res = await _http.DeleteAsync($"api/v1/busetas/{id}");

            if (!res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                return StatusCode((int)res.StatusCode, json);
            }

            return NoContent();
        }

        // ---- Assignment proxy endpoints ----

        [HttpGet]
        public async Task<IActionResult> Asignaciones(int idBuseta)
        {
            var res = await _http.GetAsync($"api/v1/busetas/{idBuseta}/asignaciones");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> CrearAsignacion(int idBuseta, [FromBody] AsignacionEstudianteBusetaCreateRequest req)
        {
            var body = JsonConvert.SerializeObject(req);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var res = await _http.PostAsync($"api/v1/busetas/{idBuseta}/asignaciones", content);
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarAsignacion(int idAsignacion)
        {
            var res = await _http.DeleteAsync($"api/v1/busetas/asignaciones/{idAsignacion}");

            if (!res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                return StatusCode((int)res.StatusCode, json);
            }

            return NoContent();
        }
    }
}
