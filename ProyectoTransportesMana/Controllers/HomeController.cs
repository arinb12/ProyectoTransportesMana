using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
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
        public IActionResult Index() { 
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
                {
                    var datosApi = respuesta.Content.ReadFromJsonAsync<UsuarioModel>().Result;
                    if (datosApi != null)
                    {
                        //HttpContext.Session.SetString("NombreUsuario", datosApi.Nombre);
                        

                        return RedirectToAction("Principal", "Home");
                    }
                }
                ViewBag.Mensaje = "Usuario o contraseña incorrecta.";
                return View();
            }
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


        public IActionResult Principal()
        {
            return View();
        }

        public IActionResult Registro()
        {
            return View();
        }
    }
}
