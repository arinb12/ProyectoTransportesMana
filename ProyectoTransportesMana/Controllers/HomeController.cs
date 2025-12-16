using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    public class HomeController : Controller
    {
        private readonly IHttpClientFactory _http;
        private readonly IConfiguration _config;

        public HomeController(IHttpClientFactory http, IConfiguration config)
        {
            _http = http;
            _config = config;
        }

        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Index(UsuarioModel usuario)
        {
            using (var context = _http.CreateClient())
            {
                var urlApi = _config["Api:BaseUrl"] + "/api/Home/ValidarSesion";
                var respuesta = context.PostAsJsonAsync(urlApi, usuario).Result;

                if (respuesta.IsSuccessStatusCode)
                {
                    var datosApi = respuesta.Content.ReadFromJsonAsync<UsuarioModel>().Result;
                    if (datosApi != null)
                    {
                        var nombreCompleto = $"{datosApi.Nombre} {datosApi.PrimerApellido}";

                        HttpContext.Session.SetString("NombreUsuario", nombreCompleto);
                        HttpContext.Session.SetString("RolUsuario", datosApi.NombreRol);
                        HttpContext.Session.SetInt32("IdUsuario", datosApi.IdUsuario ?? 0);
                        HttpContext.Session.SetInt32("IdRol", datosApi.RolId);
                        HttpContext.Session.SetString("Token", datosApi.Token);
                        HttpContext.Session.SetString("AceptoTerminos", datosApi.AceptoTerminos == true ? "1" : "0");

                        var claveFijaAsistente = _config["Valores:ClaveFijaAsistente"] ?? string.Empty;

                        if (datosApi.RolId == 5 && !string.IsNullOrWhiteSpace(claveFijaAsistente) && usuario.ContrasenaHash == claveFijaAsistente)
                        {
                            return RedirectToAction("CambiarContrasena", "Cuenta");
                        }

                        if (datosApi.RolId == 2)
                        {
                            HttpContext.Session.SetString("AceptoTerminos", datosApi.AceptoTerminos == true ? "1" : "0");

                            if (datosApi.AceptoTerminos == false)
                                return RedirectToAction("PrimerIngreso", "Cuenta");

                            return RedirectToAction("Index", "PortalPadres");
                        }
                        else
                        {
                            HttpContext.Session.Remove("AceptoTerminos");
                            return RedirectToAction("Principal", "Home");
                        }
                    }
                }

                ViewBag.Mensaje = "Usuario o contraseña incorrecta.";
                return View();
            }
        }

        [Seguridad]
        public IActionResult Principal()
        {
            return View();
        }

        [Seguridad]
        [HttpGet]
        public IActionResult CerrarSesion()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Index", "Home");
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public IActionResult Login()
        {
            return View();
        }

        [HttpGet]
        public IActionResult RecoverPassword()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RecoverPassword(string correo, [FromServices] ProyectoTransportesMana.Services.IEmailService emailService)
        {
            correo = (correo ?? "").Trim();

            if (string.IsNullOrWhiteSpace(correo))
            {
                ViewBag.Mensaje = "Debe escribir un correo.";
                return View();
            }

            var client = _http.CreateClient();

            var baseUrl = _config["Api:BaseUrl"] ?? string.Empty;
            var url = $"{baseUrl}/api/v1/cuenta/forgot-password";

            HttpResponseMessage resp;

            try
            {
                resp = await client.PostAsJsonAsync(url, new { Correo = correo });
            }
            catch (Exception ex)
            {
                ViewBag.Mensaje = "No se pudo conectar con la API. " + ex.Message;
                return View();
            }

            if (!resp.IsSuccessStatusCode)
            {
                var msg = "La API devolvió error al solicitar el token.";
                try
                {
                    var pd = await resp.Content.ReadFromJsonAsync<ProblemDetails>();
                    if (!string.IsNullOrWhiteSpace(pd?.Detail)) msg = pd.Detail;
                    else if (!string.IsNullOrWhiteSpace(pd?.Title)) msg = pd.Title;
                }
                catch { }

                ViewBag.Mensaje = msg;
                return View();
            }

            var data = await resp.Content.ReadFromJsonAsync<ForgotPasswordApiResponse>();
            var token = data?.Token;

            if (string.IsNullOrWhiteSpace(token))
            {
                TempData["SwalType"] = "success";
                TempData["SwalTitle"] = "Listo";
                TempData["SwalText"] = "Si el correo existe en el sistema, se enviaron instrucciones de recuperación.";
                return RedirectToAction("Index");
            }

            var link = Url.Action("ActualizarPassword", "Home", new { token }, Request.Scheme);

            var asunto = "Restablecer contraseña - Transportes Maná";
            var cuerpo = $@"
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p>Para continuar, abre este enlace:</p>
<p><a href=""{link}"">{link}</a></p>
<p>Este enlace expira en 30 minutos.</p>";

            try
            {
                await emailService.EnviarEmailAsync(correo, asunto, cuerpo);
            }
            catch (Exception ex)
            {
                ViewBag.Mensaje = "Falló el envío de correo. " + ex.Message;
                return View();
            }

            TempData["SwalType"] = "success";
            TempData["SwalTitle"] = "Listo";
            TempData["SwalText"] = "Si el correo existe en el sistema, se enviaron instrucciones de recuperación.";
            return RedirectToAction("Index");
        }


        private sealed class ForgotPasswordApiResponse
        {
            public bool Ok { get; set; }
            public string? Token { get; set; }
        }



        public IActionResult ResetPassword()
        {
            return View();
        }

        public IActionResult Registro()
        {
            return View();
        }

        [HttpGet]
        public IActionResult ActualizarPassword(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Index");

            ViewBag.Token = token;

            return View("ResetPassword");
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ActualizarPassword(string token, string new_password, string confirm_password)
        {
            token = (token ?? "").Trim();
            new_password = (new_password ?? "").Trim();
            confirm_password = (confirm_password ?? "").Trim();

            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Index");

            if (string.IsNullOrWhiteSpace(new_password) || string.IsNullOrWhiteSpace(confirm_password))
            {
                ViewBag.Mensaje = "Debe completar todos los campos.";
                ViewBag.Token = token;
                return View("ResetPassword");
            }

            if (new_password != confirm_password)
            {
                ViewBag.Mensaje = "Las contraseñas no coinciden.";
                ViewBag.Token = token;
                return View("ResetPassword");
            }

            var client = _http.CreateClient();

            var baseUrl = _config["Api:BaseUrl"] ?? string.Empty;
            var url = $"{baseUrl}/api/v1/cuenta/reset-password";

            var resp = await client.PostAsJsonAsync(url, new { Token = token, NewPassword = new_password });

            if (!resp.IsSuccessStatusCode)
            {
                var msg = "No se pudo actualizar la contraseña.";
                try
                {
                    var pd = await resp.Content.ReadFromJsonAsync<ProblemDetails>();
                    if (!string.IsNullOrWhiteSpace(pd?.Detail)) msg = pd.Detail;
                    else if (!string.IsNullOrWhiteSpace(pd?.Title)) msg = pd.Title;
                }
                catch { }

                ViewBag.Mensaje = msg;
                ViewBag.Token = token;
                return View("ResetPassword");
            }

            TempData["SwalType"] = "success";
            TempData["SwalTitle"] = "Listo";
            TempData["SwalText"] = "Contraseña actualizada. Ya puede iniciar sesión.";
            return RedirectToAction("Index");
        }

    }
}
