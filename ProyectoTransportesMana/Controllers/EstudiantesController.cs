using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Contracts.Estudiantes;
using ProyectoTransportesMana.Models;
using System.Net.Http.Json;
using System.Runtime.Intrinsics.Arm;
using static System.Net.WebRequestMethods;

namespace ProyectoTransportesMana.Controllers
{
    public class EstudiantesController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
      
        //private const string ApiBase = "https://localhost:7238/";

        public EstudiantesController(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

        [HttpGet]
        public async Task<IActionResult> GestionEstudiantes()
        {
            var client = _httpClientFactory.CreateClient("Api");    

            // 1) Estudiantes (para la tabla)
            var estudiantes = new List<EstudianteListItemResponse>();
            var estResp = await client.GetAsync("api/v1/estudiantes");
            if (estResp.IsSuccessStatusCode && estResp.Content.Headers.ContentLength.GetValueOrDefault() > 0)
                estudiantes = await estResp.Content.ReadFromJsonAsync<List<EstudianteListItemResponse>>() ?? new();
            ViewBag.Estudiantes = estudiantes;

            // 2) Lookups (encargados / instituciones / maestras) para los <select>
            var encargados = new List<PersonItem>();
            var encResp = await client.GetAsync("api/v1/encargados-legales");
            if (encResp.IsSuccessStatusCode && encResp.Content.Headers.ContentLength.GetValueOrDefault() > 0)
                encargados = await encResp.Content.ReadFromJsonAsync<List<PersonItem>>() ?? new();
            ViewBag.Encargados = new SelectList(encargados, "IdUsuario", "NombreCompleto");

            var instituciones = new List<InstitucionItem>();
            var instResp = await client.GetAsync("api/v1/instituciones");
            if (instResp.IsSuccessStatusCode && instResp.Content.Headers.ContentLength.GetValueOrDefault() > 0)
                instituciones = await instResp.Content.ReadFromJsonAsync<List<InstitucionItem>>() ?? new();
            ViewBag.Instituciones = new SelectList(instituciones, "IdInstitucion", "Nombre");

            var maestras = new List<PersonItem>();
            var maesResp = await client.GetAsync("api/v1/maestras");
            if (maesResp.IsSuccessStatusCode && maesResp.Content.Headers.ContentLength.GetValueOrDefault() > 0)
                maestras = await maesResp.Content.ReadFromJsonAsync<List<PersonItem>>() ?? new();
            ViewBag.Maestras = new SelectList(maestras, "IdUsuario", "NombreCompleto");

            // Modelo base del formulario
            return View(new EstudianteModel { Activo = true });
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegistrarEstudiante(EstudianteModel estudiante)
        {

            var client = _httpClientFactory.CreateClient();

           

            return View("GestionEstudiantes", estudiante);
        }

        private sealed class PersonItem
        {
            public int IdUsuario { get; set; }
            public string NombreCompleto { get; set; } = "";
        }

        private sealed class InstitucionItem
        {
            public int IdInstitucion { get; set; }
            public string Nombre { get; set; } = "";
        }

    }
}
