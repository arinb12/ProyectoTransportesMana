using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HomeController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IHostEnvironment _enviroment;

        public HomeController(IConfiguration config, IHostEnvironment enviroment)
        {
            _config = config;
            _enviroment = enviroment;
        }

        [HttpPost]
        [Route("ValidarSesion")]
        public IActionResult ValidarSesion(ValidarSesionRequestModel usuario)
        {
            using (var context = new SqlConnection(_config["ConnectionStrings:BDConnection"]))
            {
                var parametros = new DynamicParameters();
                parametros.Add("@Correo", usuario.Correo);
                parametros.Add("@ContrasenaHash", usuario.ContrasenaHash);

                var resultado = context.QueryFirstOrDefault<DatosUsuarioResponseModel>("ValidarSesion", parametros);

                if (resultado != null)
                {
                    return Ok(resultado);
                }
                else
                {
                    return Unauthorized("Credenciales inválidas.");
                }
            }
            
        }
    }
}
