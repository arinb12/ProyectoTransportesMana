using Dapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.EncargadosLegales;
using System.Data;

namespace ProyectoTransportesMana.Api.Controllers
{
    [ApiController]
    [Route("api/v1/encargados-legales")]
    public class EncargadosLegalesController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public EncargadosLegalesController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        private IDbConnection CreateConnection()
            => new SqlConnection(_configuration.GetConnectionString("BDConnection"));

        // GET: api/v1/encargados-legales
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EncargadoLegalListItemResponse>>> GetAll()
        {
            using var connection = CreateConnection();
            var result = await connection.QueryAsync<EncargadoLegalListItemResponse>(
                "sp_EncargadosLegales_Listar",
                commandType: CommandType.StoredProcedure);

            return Ok(result);
        }

        // GET: api/v1/encargados-legales/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EncargadoLegalResponse>> GetById(int id)
        {
            using var connection = CreateConnection();

            var result = await connection.QuerySingleOrDefaultAsync<EncargadoLegalResponse>(
                "sp_EncargadosLegales_Obtener",
                new { IdUsuario = id },
                commandType: CommandType.StoredProcedure);

            if (result is null)
            {
                return NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Encargado no encontrado",
                    Detail = $"No existe un encargado legal con IdUsuario = {id}."
                });
            }

            return Ok(result);
        }

        // POST: api/v1/encargados-legales
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] EncargadoLegalCreateRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            using var connection = CreateConnection();

            var hash = ProyectoTransportesManaAPI.Helpers.PasswordHasher.HashPassword(request.Contrasena);


            var parameters = new DynamicParameters();
            parameters.Add("@Nombre", request.Nombre);
            parameters.Add("@PrimerApellido", request.PrimerApellido);
            parameters.Add("@SegundoApellido", request.SegundoApellido);
            parameters.Add("@Correo", request.Correo);
            
            parameters.Add("@ContrasenaHash", hash);
            parameters.Add("@Activo", request.Activo);
            parameters.Add("@DireccionResidencia", request.DireccionResidencia);
            parameters.Add("@AceptoTerminos", request.AceptoTerminos);
            parameters.Add("@FirmaContrato", request.FirmaContrato);
            parameters.Add("@Telefono", request.Telefono);
            parameters.Add("@IdUsuarioCreado", dbType: DbType.Int32, direction: ParameterDirection.Output);

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_Crear",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                var idUsuario = parameters.Get<int>("@IdUsuarioCreado");

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = idUsuario },
                    new { IdUsuario = idUsuario });
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al crear el encargado",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al crear el encargado",
                    Detail = ex.Message
                });
            }
        }

        // PUT: api/v1/encargados-legales/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult> Update(int id, [FromBody] EncargadoLegalUpdateRequest request)
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

            var parameters = new
            {
                IdUsuario = request.IdUsuario,
                request.Nombre,
                request.PrimerApellido,
                request.SegundoApellido,
                request.Correo,
                request.Activo,
                request.DireccionResidencia,
                request.AceptoTerminos,
                request.FirmaContrato,
                request.Telefono
            };

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_Actualizar",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al actualizar el encargado",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al actualizar el encargado",
                    Detail = ex.Message
                });
            }
        }

        // PATCH: api/v1/encargados-legales/5/estado
        [HttpPatch("{id:int}/estado")]
        public async Task<ActionResult> CambiarEstado(int id, [FromBody] EncargadoLegalEstadoUpdateRequest request)
        {
            using var connection = CreateConnection();

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_CambiarEstado",
                    new { IdUsuario = id, request.Activo },
                    commandType: CommandType.StoredProcedure);

                return Ok(new
                {
                    ok = true,
                    message = request.Activo
                        ? "Encargado activado correctamente."
                        : "Encargado desactivado correctamente."
                });
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new
                {
                    ok = false,
                    title = "Error al cambiar estado",
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    ok = false,
                    title = "Error inesperado",
                    message = ex.Message
                });
            }
        }

        // DELETE: api/v1/encargados-legales/5
        [HttpDelete("{id:int}")]
        public async Task<ActionResult> Delete(int id)
        {
            using var connection = CreateConnection();

            try
            {
                await connection.ExecuteAsync(
                    "sp_EncargadosLegales_Eliminar",
                    new { IdUsuario = id },
                    commandType: CommandType.StoredProcedure);

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Error al eliminar el encargado",
                    Detail = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error inesperado al eliminar el encargado",
                    Detail = ex.Message
                });
            }
        }
    }
}
