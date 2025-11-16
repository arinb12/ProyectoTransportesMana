using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;
using ProyectoTransportesManaAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ProyectoTransportesManaAPI.Controllers
{
    [AllowAnonymous]
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
                    resultado.Token = GenerarToken(resultado.IdUsuario, resultado.Nombre, resultado.RolId);
                    return Ok(resultado);
                }
                else
                {
                    return Unauthorized("Credenciales inválidas.");
                }
            }
            
        }

        private string GenerarToken(int usuarioId, string nombre, int rol)
        {
            var key = _config["Valores:KeyJWT"]!;

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("id", usuarioId.ToString()),
                new Claim("nombre", nombre),
                new Claim("rol", rol.ToString())
            };

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(60),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

    }
}
