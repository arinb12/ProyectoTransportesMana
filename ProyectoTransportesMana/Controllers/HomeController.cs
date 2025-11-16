using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Diagnostics;
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

                var urlApi = _config["Api:BaseUrl"] + "api/Home/ValidarSesion";
                var respuesta = context.PostAsJsonAsync(urlApi, usuario).Result;

                if (respuesta.IsSuccessStatusCode)
                    // TODO VALIDAR QUE TIPO DE USUARIO SE LOGUEA PARA ENVIAR UNA U OTRA VISTA AL LOGUEARSE
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


                        return RedirectToAction("Principal", "Home");
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

        public IActionResult RecoverPassword()
        {
            return View();
        }

        public IActionResult ResetPassword()
        {
            return View();
        }


        public IActionResult Registro()
        {
            return View();
        }
    }
}
