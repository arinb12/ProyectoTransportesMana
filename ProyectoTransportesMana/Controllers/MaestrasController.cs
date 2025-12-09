using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using ProyectoTransportesMana.Contracts.Maestras;

public class MaestrasController : Controller
{
    private readonly HttpClient _http;

    public MaestrasController(IHttpClientFactory factory)
    {
        _http = factory.CreateClient("Api");
    }

    public async Task<IActionResult> Maestras()
    {
        var res = await _http.GetAsync("api/v1/maestras");
        var json = await res.Content.ReadAsStringAsync();
        var lista = JsonConvert.DeserializeObject<List<MaestraListItemResponse>>(json);

        ViewBag.Maestras = lista;
        return View();
    }
}

