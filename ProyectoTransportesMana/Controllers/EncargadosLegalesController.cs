using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Contracts.EncargadosLegales;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Net;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    public class EncargadosLegalesController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public EncargadosLegalesController(IHttpClientFactory httpClientFactory)
            => _httpClientFactory = httpClientFactory;

        private HttpClient CreateClient()
            => _httpClientFactory.CreateClient("Api");

        // GET: pantalla principal de gestión
        [HttpGet]
        public async Task<IActionResult> GestionEncargadosLegales()
        {
            await CargarDatosVistaAsync();
            return View(new EncargadoLegalModel { Activo = true });
        }

        // POST: registrar nuevo encargado
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RegistrarEncargado(EncargadoLegalModel model)
        {
            if (!ModelState.IsValid)
            {
                await CargarDatosVistaAsync();
                ViewData["SwalType"] = "warning";
                ViewData["SwalTitle"] = "Revisa el formulario";
                ViewData["SwalText"] = "Hay campos requeridos o con formato inválido.";
                return View("GestionEncargadosLegales", model);
            }

            var client = CreateClient();

            var payload = new EncargadoLegalCreateRequest
            {
                Nombre = model.Nombre,
                PrimerApellido = model.PrimerApellido,
                SegundoApellido = model.SegundoApellido,
                Correo = model.Correo,
                Contrasena = model.Contrasena,
                Activo = model.Activo,
                DireccionResidencia = model.DireccionResidencia,
                AceptoTerminos = model.AceptoTerminos,
                FirmaContrato = model.FirmaContrato,
                Telefono = model.Telefono
            };

            var resp = await client.PostAsJsonAsync("api/v1/encargados-legales", payload);

            if (resp.IsSuccessStatusCode)
            {
                return RedirectToAction(nameof(GestionEncargadosLegales), new { created = true });
            }

            var problem = await SafeReadProblemDetails(resp);
            ModelState.AddModelError(string.Empty,
                problem?.Detail ?? problem?.Title ?? "No se pudo registrar el encargado.");

            ViewData["SwalType"] = "error";
            ViewData["SwalTitle"] = "Error al registrar";
            ViewData["SwalText"] = "Ocurrió un error al guardar.";

            await CargarDatosVistaAsync();
            return View("GestionEncargadosLegales", model);
        }

        // POST: eliminar encargado
        [HttpPost]
        public async Task<IActionResult> EliminarEncargado(int id)
        {
            var client = CreateClient();
            var resp = await client.DeleteAsync($"api/v1/encargados-legales/{id}");

            if (resp.IsSuccessStatusCode)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Ok(new
                    {
                        ok = true,
                        title = "Encargado eliminado",
                        message = "El encargado fue eliminado correctamente."
                    });
                }
                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Encargado eliminado";
                TempData["SwalText"] = "El encargado fue eliminado correctamente.";
                return RedirectToAction(nameof(GestionEncargadosLegales));
            }

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return BadRequest(new
                {
                    ok = false,
                    title = "Error al eliminar",
                    message = "No se pudo eliminar el encargado."
                });
            }

            TempData["SwalType"] = "error";
            TempData["SwalTitle"] = "Error al eliminar";
            TempData["SwalText"] = "No se pudo eliminar el encargado.";
            return RedirectToAction(nameof(GestionEncargadosLegales));
        }

        // POST: cambiar estado (activo/inactivo)
        [HttpPost]
        public async Task<IActionResult> CambiarEstado(int id, bool activo)
        {
            var client = CreateClient();
            var content = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(new EncargadoLegalEstadoUpdateRequest { Activo = activo }),
                System.Text.Encoding.UTF8,
                "application/json");

            var resp = await client.PatchAsync($"api/v1/encargados-legales/{id}/estado", content);

            if (!resp.IsSuccessStatusCode)
            {
                return Json(new
                {
                    ok = false,
                    title = "Error al cambiar estado",
                    message = "No se pudo actualizar el estado del encargado."
                });
            }

            return Json(new
            {
                ok = true,
                title = activo ? "Encargado activado" : "Encargado desactivado",
                message = activo
                    ? "El encargado ahora está activo."
                    : "El encargado fue desactivado correctamente."
            });
        }

        // GET: obtener datos para editar (AJAX)
        [HttpGet]
        public async Task<IActionResult> ObtenerParaEditar(int id)
        {
            var client = CreateClient();
            var resp = await client.GetAsync($"api/v1/encargados-legales/{id}");

            if (!resp.IsSuccessStatusCode)
            {
                if (resp.StatusCode == HttpStatusCode.NotFound)
                    return NotFound(new { ok = false, message = "Encargado no encontrado." });

                return StatusCode((int)resp.StatusCode, new { ok = false, message = "Error al consultar la API." });
            }

            var dto = await resp.Content.ReadFromJsonAsync<EncargadoLegalResponse>();
            if (dto is null)
                return StatusCode(500, new { ok = false, message = "Respuesta inválida de la API." });

            // Mapear DTO -> modelo de pantalla
            var model = new EncargadoLegalModel
            {
                IdUsuario = dto.IdUsuario,
                Nombre = dto.Nombre,
                PrimerApellido = dto.PrimerApellido,
                SegundoApellido = dto.SegundoApellido,
                Correo = dto.Correo,
                Activo = dto.Activo,
                DireccionResidencia = dto.DireccionResidencia,
                AceptoTerminos = dto.AceptoTerminos,
                FirmaContrato = dto.FirmaContrato,
                Telefono = dto.Telefono
                // Contrasena se deja vacío, no se edita aquí
            };

            return Json(new { ok = true, data = model });
        }

        // POST: actualizar encargado (AJAX)
        [HttpPost]
        public async Task<IActionResult> ActualizarEncargado(EncargadoLegalModel model)
        {
            ModelState.Remove(nameof(EncargadoLegalModel.Contrasena));
            if (!ModelState.IsValid)
                return BadRequest(new { ok = false, message = "Datos inválidos en el formulario." });

            var client = CreateClient();

            var payload = new EncargadoLegalUpdateRequest
            {
                IdUsuario = model.IdUsuario,
                Nombre = model.Nombre,
                PrimerApellido = model.PrimerApellido,
                SegundoApellido = model.SegundoApellido,
                Correo = model.Correo,
                Activo = model.Activo,
                DireccionResidencia = model.DireccionResidencia,
                AceptoTerminos = model.AceptoTerminos,
                FirmaContrato = model.FirmaContrato,
                Telefono = model.Telefono
            };

            var resp = await client.PutAsJsonAsync(
                $"api/v1/encargados-legales/{model.IdUsuario}", payload);

            if (!resp.IsSuccessStatusCode)
                return Json(new { ok = false, message = "No se pudo actualizar el encargado." });

            return Json(new { ok = true, message = "Encargado actualizado correctamente." });
        }

        // Cargar lista de encargados para la vista
        private async Task CargarDatosVistaAsync()
        {
            var client = CreateClient();

            var encargados = await GetOrEmpty<List<EncargadoLegalListItemResponse>>(
                client, "api/v1/encargados-legales") ?? new();

            ViewBag.Encargados = encargados;
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
    }
}
