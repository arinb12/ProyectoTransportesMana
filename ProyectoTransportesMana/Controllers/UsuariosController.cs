using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ProyectoTransportesMana.Contracts.Usuarios;
using ProyectoTransportesMana.Models.Filters;
using ProyectoTransportesMana.Models.Usuarios;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    [AutorizarRoles(1)]
    public class UsuariosController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public UsuariosController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        private bool IsAdmin()
        {
            var rol = HttpContext.Session.GetInt32("IdRol");
            return rol.HasValue && rol.Value == 1;
        }

        private IActionResult? DenyIfNotAdmin()
        {
            if (IsAdmin()) return null;
            return RedirectToAction("Principal", "Home");
        }

        private HttpClient CreateClient()
        {
            var client = _httpClientFactory.CreateClient("Api");

            var token = HttpContext.Session.GetString("Token");
            if (!string.IsNullOrWhiteSpace(token))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        private static List<SelectListItem> BuildRoles() => new()
        {
            new SelectListItem("Admin", "1"),
            new SelectListItem("Encargado", "2"),
            new SelectListItem("Maestra", "3"),
            new SelectListItem("Estudiante", "4"),
            new SelectListItem("Asistente", "5"),
        };

        [HttpGet]
        public async Task<IActionResult> GestionUsuarios()
        {
            var deny = DenyIfNotAdmin();
            if (deny != null) return deny;

            var client = CreateClient();

            var usuarios = await SafeGet<List<UsuarioListItemResponse>>(client, "api/v1/usuarios") ?? new();

            var vm = new UsuariosGestionViewModel
            {
                Usuarios = usuarios,
                Roles = BuildRoles()
            };

            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CrearUsuario(UsuariosGestionViewModel vm)
        {
            var deny = DenyIfNotAdmin();
            if (deny != null) return deny;

            vm.Roles = BuildRoles();

            if (!ModelState.IsValid)
            {
                vm.Usuarios = await LoadUsuarios() ?? new();
                return View("GestionUsuarios", vm);
            }

            var client = CreateClient();
            var resp = await client.PostAsJsonAsync("api/v1/usuarios", vm.Nuevo);

            if (!resp.IsSuccessStatusCode)
            {
                vm.Usuarios = await LoadUsuarios() ?? new();
                await SetTempDataErrorFromProblemDetails(resp, "No se pudo crear el usuario.");
                return View("GestionUsuarios", vm);
            }

            TempData["SwalType"] = "success";
            TempData["SwalTitle"] = "Usuario creado";
            TempData["SwalText"] = "El usuario fue creado correctamente.";
            return RedirectToAction(nameof(GestionUsuarios));
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerParaEditar(int id)
        {
            var deny = DenyIfNotAdmin();
            if (deny != null) return deny;

            var client = CreateClient();
            var resp = await client.GetAsync($"api/v1/usuarios/{id}");

            if (!resp.IsSuccessStatusCode)
            {
                if (resp.StatusCode == HttpStatusCode.NotFound)
                    return NotFound(new { ok = false, message = "Usuario no encontrado." });

                return StatusCode((int)resp.StatusCode, new { ok = false, message = "Error consultando la API." });
            }

            var dto = await resp.Content.ReadFromJsonAsync<UsuarioResponse>();
            if (dto is null)
                return StatusCode(500, new { ok = false, message = "Respuesta inválida de la API." });

            var model = new UsuarioUpdateRequest
            {
                IdUsuario = dto.IdUsuario,
                RolId = dto.RolId,
                Nombre = dto.Nombre,
                PrimerApellido = dto.PrimerApellido,
                SegundoApellido = dto.SegundoApellido,
                Correo = dto.Correo,
                Activo = dto.Activo,
                Contrasena = null
            };

            return Json(new { ok = true, data = model });
        }

        [HttpPost]
        public async Task<IActionResult> ActualizarUsuario([FromBody] UsuarioUpdateRequest model)
        {
            var deny = DenyIfNotAdmin();
            if (deny != null) return deny;

            if (!TryValidateModel(model))
                return BadRequest(new { ok = false, message = "Datos inválidos." });

            var client = CreateClient();
            var resp = await client.PutAsJsonAsync($"api/v1/usuarios/{model.IdUsuario}", model);

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await ReadProblemDetails(resp) ?? "No se pudo actualizar el usuario.";
                return BadRequest(new { ok = false, message = msg });
            }

            return Ok(new { ok = true, message = "Usuario actualizado correctamente." });
        }

        [HttpPost]
        public async Task<IActionResult> EliminarUsuario(int id)
        {
            var deny = DenyIfNotAdmin();
            if (deny != null) return deny;

            var client = CreateClient();
            var resp = await client.DeleteAsync($"api/v1/usuarios/{id}");

            if (!resp.IsSuccessStatusCode)
            {
                var msg = await ReadProblemDetails(resp) ?? "No se pudo eliminar el usuario.";
                return BadRequest(new { ok = false, message = msg });
            }

            return Ok(new { ok = true, message = "Usuario eliminado correctamente." });
        }

        private async Task<List<UsuarioListItemResponse>?> LoadUsuarios()
        {
            var client = CreateClient();
            return await SafeGet<List<UsuarioListItemResponse>>(client, "api/v1/usuarios");
        }

        private static async Task<T?> SafeGet<T>(HttpClient client, string url)
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

        private static async Task<string?> ReadProblemDetails(HttpResponseMessage resp)
        {
            try
            {
                var pd = await resp.Content.ReadFromJsonAsync<ProblemDetails>();
                if (!string.IsNullOrWhiteSpace(pd?.Detail)) return pd.Detail;
                if (!string.IsNullOrWhiteSpace(pd?.Title)) return pd.Title;
                return null;
            }
            catch
            {
                return null;
            }
        }

        private async Task SetTempDataErrorFromProblemDetails(HttpResponseMessage resp, string fallback)
        {
            var msg = await ReadProblemDetails(resp) ?? fallback;

            TempData["SwalType"] = "error";
            TempData["SwalTitle"] = "Error";
            TempData["SwalText"] = msg;
        }
    }
}
