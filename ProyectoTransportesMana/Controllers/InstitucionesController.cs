using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Text.Json;

[Seguridad]
[AutorizarRoles(1)]
public class InstitucionesController : Controller
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAntiforgery _antiforgery;

    public InstitucionesController(IHttpClientFactory httpClientFactory, IAntiforgery antiforgery)
    {
        _httpClientFactory = httpClientFactory;
        _antiforgery = antiforgery;
    }

    [HttpGet]
    public async Task<IActionResult> ConsultarInstitucion()
    {
        var api = _httpClientFactory.CreateClient("Api");
        var lista = await api.GetFromJsonAsync<List<InstitucionModel>>("api/v1/instituciones");
        return View(lista ?? new());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CrearInstitucion([FromBody] InstitucionModel model)
    {
        var api = _httpClientFactory.CreateClient("Api");
        var resp = await api.PostAsJsonAsync("api/v1/instituciones", new { Nombre = model.Nombre });

        return resp.IsSuccessStatusCode ? Ok() : BadRequest();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ActualizarInstitucion([FromBody] InstitucionModel model)
    {
        var api = _httpClientFactory.CreateClient("Api");

        var resp = await api.PutAsJsonAsync(
            $"api/v1/instituciones/{model.IdInstitucion}",
            new { IdInstitucion = model.IdInstitucion, Nombre = model.Nombre }
        );

        return resp.IsSuccessStatusCode ? Ok() : BadRequest();
    }

    [HttpDelete]
    public async Task<IActionResult> EliminarInstitucion(int id)
    {
        var api = _httpClientFactory.CreateClient("Api");
        var resp = await api.DeleteAsync($"api/v1/instituciones/{id}");

        if (resp.IsSuccessStatusCode)
            return Json(new { success = true, message = "Institución eliminada correctamente." });

        string json = await resp.Content.ReadAsStringAsync();

        var errorObj = JsonSerializer.Deserialize<Dictionary<string, string>>(json);

        errorObj.TryGetValue("message", out string mensaje);

        return Json(new { success = false, message = mensaje ?? "Ocurrió un error inesperado." });
    }


    [HttpGet]
    public IActionResult Token()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        return Json(new { token = tokens.RequestToken });
    }
}
