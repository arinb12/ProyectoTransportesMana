using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Usuarios;
using System.Data;

namespace ProyectoTransportesMana.Api.Controllers
{
    [ApiController]
    [Route("api/v1/usuarios")]
    [Authorize] // si tu API valida token/JWT
    public class UsuariosController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public UsuariosController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private IDbConnection CreateConnection()
            => new SqlConnection(_configuration.GetConnectionString("BDConnection"));

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UsuarioListItemResponse>>> GetAll()
        {
            using var connection = CreateConnection();

            var result = await connection.QueryAsync<UsuarioListItemResponse>(
                "sp_usuarios_listar",
                commandType: CommandType.StoredProcedure);

            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<UsuarioResponse>> GetById(int id)
        {
            using var connection = CreateConnection();

            var result = await connection.QuerySingleOrDefaultAsync<UsuarioResponse>(
                "sp_usuarios_obtener",
                new { IdUsuario = id },
                commandType: CommandType.StoredProcedure);

            if (result is null)
            {
                return NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Usuario no encontrado",
                    Detail = $"No existe un usuario con IdUsuario = {id}."
                });
            }

            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] UsuarioCreateRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            using var connection = CreateConnection();

            // usa el mismo helper que ya usas en otros controllers
            var hash = ProyectoTransportesManaAPI.Helpers.PasswordHasher.HashPassword(request.Contrasena);

            try
            {
                var id = await connection.QuerySingleAsync<int>(
                    "sp_usuarios_crear",
                    new
                    {
                        RolId = request.RolId,
                        request.Nombre,
                        request.PrimerApellido,
                        request.SegundoApellido,
                        request.Correo,
                        ContrasenaHash = hash,
                        Activo = request.Activo
                    },
                    commandType: CommandType.StoredProcedure);

                return CreatedAtAction(nameof(GetById), new { id }, new { IdUsuario = id });
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al crear el usuario",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al crear el usuario",
                    Detail = ex.Message
                });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult> Update(int id, [FromBody] UsuarioUpdateRequest request)
        {
            if (id != request.IdUsuario)
            {
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Id inconsistente",
                    Detail = "El id de la ruta no coincide con el IdUsuario del cuerpo."
                });
            }

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            using var connection = CreateConnection();

            // si viene contraseña, se hashea; si no viene, mandamos null y tu SP no la cambia
            string? hash = null;
            if (!string.IsNullOrWhiteSpace(request.Contrasena))
                hash = ProyectoTransportesManaAPI.Helpers.PasswordHasher.HashPassword(request.Contrasena);

            try
            {
                var rows = await connection.QuerySingleAsync<int>(
                    "sp_usuarios_actualizar",
                    new
                    {
                        IdUsuario = request.IdUsuario,
                        RolId = request.RolId,
                        request.Nombre,
                        request.PrimerApellido,
                        request.SegundoApellido,
                        request.Correo,
                        Activo = request.Activo,
                        ContrasenaHash = hash
                    },
                    commandType: CommandType.StoredProcedure);

                if (rows <= 0)
                {
                    return NotFound(new ProblemDetails
                    {
                        Status = StatusCodes.Status404NotFound,
                        Title = "Usuario no encontrado",
                        Detail = $"No existe un usuario con IdUsuario = {id}."
                    });
                }

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al actualizar el usuario",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al actualizar el usuario",
                    Detail = ex.Message
                });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            using var connection = CreateConnection();

            try
            {
                await connection.ExecuteAsync(
                    "sp_usuarios_eliminar_real",
                    new { IdUsuario = id },
                    commandType: CommandType.StoredProcedure);

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al eliminar el usuario",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al eliminar el usuario",
                    Detail = ex.Message
                });
            }
        }
    }
}
