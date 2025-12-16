using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using ProyectoTransportesMana.Contracts.Maestras;
using System.Text;

namespace ProyectoTransportesMana.Controllers
{
    public class GestionMaestrasController : Controller
    {
        private readonly HttpClient _http;

        public GestionMaestrasController(IHttpClientFactory factory)
        {
            _http = factory.CreateClient("Api");
        }

        [HttpGet]
        public IActionResult Maestras()
        {
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            var res = await _http.GetAsync("api/v1/gestion-maestras");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var res = await _http.GetAsync($"api/v1/gestion-maestras/{id}");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpGet]
        public async Task<IActionResult> InstitucionesLookup()
        {
            var res = await _http.GetAsync("api/v1/instituciones");
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] MaestraCreateRequest req)
        {
            var body = JsonConvert.SerializeObject(req);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var res = await _http.PostAsync("api/v1/gestion-maestras", content);
            var json = await res.Content.ReadAsStringAsync();

            if (!res.IsSuccessStatusCode)
                return StatusCode((int)res.StatusCode, json);

            return Content(json, "application/json");
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar(int id, [FromBody] MaestraUpdateRequest req)
        {
            if (id != req.IdMaestra)
                return BadRequest("ID no coincide");

            var body = JsonConvert.SerializeObject(req);
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var res = await _http.PutAsync($"api/v1/gestion-maestras/{id}", content);

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
            var res = await _http.DeleteAsync($"api/v1/gestion-maestras/{id}");

            if (!res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync();
                return StatusCode((int)res.StatusCode, json);
            }

            return NoContent();
        }
    }
}
