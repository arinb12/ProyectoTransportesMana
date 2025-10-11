using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Contracts.Estudiantes;
using ProyectoTransportesMana.Models;
using System.Net;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    public class EstudiantesController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public EstudiantesController(IHttpClientFactory httpClientFactory)
            => _httpClientFactory = httpClientFactory;

        [HttpGet]
        public async Task<IActionResult> GestionEstudiantes()
        {
            await CargarDatosVistaAsync();
            return View(new EstudianteModel { Activo = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegistrarEstudiante(EstudianteModel estudiante)
        {
            if (!ModelState.IsValid)
            {
                await CargarDatosVistaAsync();
                ViewData["SwalType"] = "warning";
                ViewData["SwalTitle"] = "Revisa el formulario";
                ViewData["SwalText"] = "Hay campos requeridos o con formato inválido.";
                return View("GestionEstudiantes", estudiante);
            }

            var client = _httpClientFactory.CreateClient("Api");
            var payload = new EstudianteCreateRequest
            {
                Nombre = estudiante.Nombre!,
                PrimerApellido = estudiante.PrimerApellido!,
                SegundoApellido = estudiante.SegundoApellido,
                Activo = estudiante.Activo,
                IdEncargado = estudiante.IdEncargado,
                IdInstitucion = estudiante.IdInstitucion,
                Seccion = estudiante.Seccion,
                IdMaestra = estudiante.IdMaestra,
                Telefono = estudiante.Telefono!     
            };

            var resp = await client.PostAsJsonAsync("api/v1/estudiantes", payload);

            if (resp.IsSuccessStatusCode)
            {
                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Estudiante registrado";
                TempData["SwalText"] = "El registro se completó correctamente.";
                return RedirectToAction(nameof(GestionEstudiantes));
            }

            var problem = await SafeReadProblemDetails(resp);

            ModelState.AddModelError(string.Empty,
                problem?.Detail ?? problem?.Title ?? "No se pudo registrar el estudiante.");

            ViewData["SwalType"] = "error";
            ViewData["SwalTitle"] = "Error al registrar";
            ViewData["SwalText"] = problem?.Detail ?? "Ocurrió un error al guardar.";

            await CargarDatosVistaAsync();
            return View("GestionEstudiantes", estudiante);
        }


        [HttpPost]
        public async Task<IActionResult> EliminarEstudiante(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var resp = await client.DeleteAsync($"api/v1/estudiantes/{id}");

            if (resp.IsSuccessStatusCode)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Ok(new
                    {
                        ok = true,
                        title = "Estudiante eliminado",
                        message = "El estudiante fue eliminado correctamente."
                    });
                }
                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Estudiante eliminado";
                TempData["SwalText"] = "El estudiante fue eliminado correctamente.";
                return RedirectToAction(nameof(GestionEstudiantes));
            }

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return BadRequest(new
                {
                    ok = false,
                    title = "Error al eliminar",
                    message = "No se pudo eliminar el estudiante."
                });
            }

            TempData["SwalType"] = "error";
            TempData["SwalTitle"] = "Error al eliminar";
            TempData["SwalText"] = "No se pudo eliminar el estudiante.";
            return RedirectToAction(nameof(GestionEstudiantes));
        }


        [HttpPost]
        public async Task<IActionResult> CambiarEstado(int id, bool activo)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var content = new StringContent(activo.ToString().ToLower(), System.Text.Encoding.UTF8, "application/json");
            var resp = await client.PatchAsync($"api/v1/estudiantes/{id}/estado", content);

            if (!resp.IsSuccessStatusCode)
            {
                return Json(new
                {
                    ok = false,
                    title = "Error al cambiar estado",
                    message = "No se pudo actualizar el estado del estudiante."
                });
            }

            return Json(new
            {
                ok = true,
                title = activo ? "Estudiante activado" : "Estudiante desactivado",
                message = activo
                    ? "El estudiante ahora está activo."
                    : "El estudiante fue desactivado correctamente."
            });
        }

        private async Task CargarDatosVistaAsync()
        {
            var client = _httpClientFactory.CreateClient("Api");

            // 1) Estudiantes para la tabla
            var estudiantes = await GetOrEmpty<List<EstudianteListItemResponse>>(client, "api/v1/estudiantes") ?? new();
            ViewBag.Estudiantes = estudiantes;

            // 2) Lookups
            var encargados = await GetOrEmpty<List<PersonItem>>(client, "api/v1/encargados-legales") ?? new();
            ViewBag.Encargados = new SelectList(encargados, "IdUsuario", "NombreCompleto");

            var instituciones = await GetOrEmpty<List<InstitucionItem>>(client, "api/v1/instituciones") ?? new();
            ViewBag.Instituciones = new SelectList(instituciones, "IdInstitucion", "Nombre");

            var maestras = await GetOrEmpty<List<PersonItem>>(client, "api/v1/maestras") ?? new();
            ViewBag.Maestras = new SelectList(maestras, "IdUsuario", "NombreCompleto");
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
            catch { return null; }
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
