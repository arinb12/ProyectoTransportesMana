using Dapper;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class ErrorController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public ErrorController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [Route("RegistrarError")]
        public IActionResult RegistrarError()
        {
            var exception = HttpContext.Features.Get<IExceptionHandlerFeature>();

            using (var context = new SqlConnection(_configuration["ConnectionStrings:BDConnection"]))
            {
                var parametros = new DynamicParameters();
                parametros.Add("@id_usuario", 0);
                parametros.Add("@mensaje", exception?.Error.Message);
                parametros.Add("@origen", exception?.Path);

                context.Execute("sp_registrar_error", parametros, commandType: System.Data.CommandType.StoredProcedure);
            }
            return StatusCode(500, "Se presentó una excepción en nuestro servicio");
        }
    }
}
