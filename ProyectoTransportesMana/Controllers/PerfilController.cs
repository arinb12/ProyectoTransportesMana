using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models.Filters;
using ProyectoTransportesMana.Models.Perfil;
using System.Net.Http.Headers;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    [AutorizarRoles(1,2,5)]
    public class PerfilController : Controller
    {
        private readonly IHttpClientFactory _http;
        private readonly IConfiguration _configuration;

        public PerfilController(IHttpClientFactory http, IConfiguration configuration)
        {
            _http = http;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var idUsuario = HttpContext.Session.GetInt32("IdUsuario") ?? 0;
            if (idUsuario <= 0) return RedirectToAction("Login", "Home");

            using var client = _http.CreateClient("Api");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", HttpContext.Session.GetString("Token"));

            var resp = await client.GetAsync($"api/v1/perfil/{idUsuario}");
            if (!resp.IsSuccessStatusCode)
            {
                ViewBag.Mensaje = "No se pudo cargar el perfil.";
                return View(new PerfilVm { IdUsuario = idUsuario });
            }

            var vm = await resp.Content.ReadFromJsonAsync<PerfilVm>() ?? new PerfilVm { IdUsuario = idUsuario };
            return View(vm);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Index(PerfilVm model, IFormFile? Imagen)
        {
            var idUsuario = HttpContext.Session.GetInt32("IdUsuario") ?? 0;
            if (idUsuario <= 0) return RedirectToAction("Login", "Home");

            model.IdUsuario = idUsuario;

            var rol = HttpContext.Session.GetInt32("IdRol") ?? 0;
            var esAdmin = rol == 1;

            string? rutaRelativa = model.FotoPerfil;

            if (Imagen != null && Imagen.Length > 0)
            {
                var carpetaDestino = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "imagenes", "perfiles");
                if (!Directory.Exists(carpetaDestino))
                    Directory.CreateDirectory(carpetaDestino);

                var extension = Path.GetExtension(Imagen.FileName);
                if (string.IsNullOrWhiteSpace(extension)) extension = ".png";

                var nombreArchivo = $"{idUsuario}{extension.ToLower()}";
                var rutaCompleta = Path.Combine(carpetaDestino, nombreArchivo);

                using var stream = new FileStream(rutaCompleta, FileMode.Create);
                await Imagen.CopyToAsync(stream);

                rutaRelativa = $"/imagenes/perfiles/{nombreArchivo}";
            }

            var payload = new PerfilUpdateRequestMvc
            {
                IdUsuario = idUsuario,
                Correo = model.Correo,
                Telefono = esAdmin ? null : model.Telefono,
                FotoPerfil = rutaRelativa
            };

            using var client = _http.CreateClient("Api");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", HttpContext.Session.GetString("Token"));

            var resp = await client.PutAsJsonAsync("api/v1/perfil", payload);

            if (!resp.IsSuccessStatusCode)
            {
                ViewBag.Mensaje = "No se pudo actualizar el perfil.";
                return View(model);
            }

            TempData["Ok"] = "Perfil actualizado correctamente.";
            return RedirectToAction(nameof(Index));
        }

    }
}
