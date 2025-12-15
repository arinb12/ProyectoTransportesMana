using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Helpers;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/cuenta")]
    public class CuentaController : ControllerBase
    {
        private readonly IConfiguration _config;

        public CuentaController(IConfiguration config)
        {
            _config = config;
        }

        private IDbConnection CreateConnection()
            => new SqlConnection(_config.GetConnectionString("BDConnection"));

        public sealed class PrimerIngresoRequest
        {
            public int IdUsuario { get; set; }
            public string NuevaContrasena { get; set; } = string.Empty;
            public bool AceptoTerminos { get; set; }
        }

        public sealed class CambiarContrasenaRequest
        {
            public int IdUsuario { get; set; }
            public string NuevaContrasena { get; set; } = string.Empty;
        }

        [HttpPost("primer-ingreso")]
        public async Task<IActionResult> PrimerIngreso([FromBody] PrimerIngresoRequest request)
        {
            if (request.IdUsuario <= 0)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Id de usuario inválido",
                    Detail = "Debe enviarse un IdUsuario válido."
                });
            }

            if (string.IsNullOrWhiteSpace(request.NuevaContrasena))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Contraseña requerida",
                    Detail = "La nueva contraseña no puede estar vacía."
                });
            }

            using var connection = CreateConnection();

            var hash = PasswordHasher.HashPassword(request.NuevaContrasena);

            var parameters = new DynamicParameters();
            parameters.Add("@IdUsuario", request.IdUsuario);
            parameters.Add("@ContrasenaHash", hash);
            parameters.Add("@AceptoTerminos", request.AceptoTerminos);

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_PrimerIngreso",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al ejecutar primer ingreso",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado en primer ingreso",
                    Detail = ex.Message
                });
            }
        }

        [HttpPost("cambiar-contrasena")]
        public async Task<IActionResult> CambiarContrasena([FromBody] CambiarContrasenaRequest request)
        {
            if (request.IdUsuario <= 0)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Id de usuario inválido",
                    Detail = "Debe enviarse un IdUsuario válido."
                });
            }

            if (string.IsNullOrWhiteSpace(request.NuevaContrasena))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Contraseña requerida",
                    Detail = "La nueva contraseña no puede estar vacía."
                });
            }

            using var connection = CreateConnection();

            var hash = PasswordHasher.HashPassword(request.NuevaContrasena);

            var parameters = new DynamicParameters();
            parameters.Add("@IdUsuario", request.IdUsuario);
            parameters.Add("@ContrasenaHash", hash);

            try
            {
                var rows = await connection.QuerySingleAsync<int>(
                    "dbo.sp_usuarios_cambiar_contrasena",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (rows == 0)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "Usuario no encontrado",
                        Detail = "No existe el usuario indicado."
                    });
                }

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al cambiar contraseña",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al cambiar contraseña",
                    Detail = ex.Message
                });
            }
        }

        [HttpPost("reset-credenciales")]
        public async Task<IActionResult> ResetCredenciales([FromBody] ResetCredencialesRequest request)
        {
            if (request.IdUsuario <= 0)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Id de usuario inválido",
                    Detail = "Debe enviarse un IdUsuario válido."
                });
            }

            var tempPassword = GenerarPasswordTemporal();
            var hash = PasswordHasher.HashPassword(tempPassword);

            using var connection = CreateConnection();

            var parameters = new DynamicParameters();
            parameters.Add("@IdUsuario", request.IdUsuario);
            parameters.Add("@ContrasenaHash", hash);

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_ResetCredenciales",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return Ok(new
                {
                    ok = true,
                    tempPassword
                });
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al resetear credenciales",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al resetear credenciales",
                    Detail = ex.Message
                });
            }
        }



        public sealed class ResetCredencialesRequest
        {
            public int IdUsuario { get; set; }
        }

        private string GenerarPasswordTemporal()
        {
            const int longitud = 10;
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";

            var random = new Random();
            var buffer = new char[longitud];

            for (int i = 0; i < longitud; i++)
                buffer[i] = chars[random.Next(chars.Length)];

            return new string(buffer);
        }


        public sealed class ForgotPasswordRequest
        {
            public string Correo { get; set; } = string.Empty;
        }

        public sealed class ForgotPasswordResponse
        {
            public bool Ok { get; set; }
            public string? Token { get; set; }
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var correo = (request.Correo ?? "").Trim();
            if (string.IsNullOrWhiteSpace(correo))
                return BadRequest(new ProblemDetails { Title = "Correo requerido", Detail = "Debe indicar un correo." });

            var token = Guid.NewGuid().ToString("N");

            using var connection = CreateConnection();

            var p = new DynamicParameters();
            p.Add("@Correo", correo);
            p.Add("@Token", token);
            p.Add("@Ok", dbType: DbType.Boolean, direction: ParameterDirection.Output);

            await connection.ExecuteAsync("sp_password_reset_crear", p, commandType: CommandType.StoredProcedure);

            var ok = p.Get<bool>("@Ok");

            return Ok(new ForgotPasswordResponse
            {
                Ok = true,
                Token = ok ? token : null
            });
        }

        public sealed class ResetPasswordRequest
        {
            public string Token { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var token = (request.Token ?? "").Trim();
            var pass = (request.NewPassword ?? "").Trim();

            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(pass))
                return BadRequest(new ProblemDetails { Title = "Datos requeridos", Detail = "Token y contraseña son requeridos." });

            var hash = ProyectoTransportesManaAPI.Helpers.PasswordHasher.HashPassword(pass);

            using var connection = CreateConnection();

            try
            {
                await connection.ExecuteAsync(
                    "sp_password_reset_aplicar",
                    new { Token = token, ContrasenaHash = hash },
                    commandType: CommandType.StoredProcedure);

                return Ok(new { ok = true, message = "Contraseña actualizada correctamente." });
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "No se pudo restablecer",
                    Detail = ex.Message
                });
            }
        }






    }
}
