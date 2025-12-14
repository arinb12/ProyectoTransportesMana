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
    }
}
