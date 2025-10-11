using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Estudiantes;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/estudiantes")]
    public class EstudiantesController : ControllerBase
    {
        private readonly IConfiguration _config;
        public EstudiantesController(IConfiguration config) => _config = config;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EstudianteListItemResponse>>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<EstudianteListItemResponse>(
                "sp_estudiantes_listar",
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }


        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(EstudianteResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<EstudianteResponse>> GetById(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var est = await con.QuerySingleOrDefaultAsync<EstudianteResponse>(
                "sp_estudiantes_obtener",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            return est is null ? NotFound() : Ok(est);
        }


        [HttpPost]
        [ProducesResponseType(typeof(EstudianteResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<EstudianteResponse>> RegistrarEstudiante([FromBody] EstudianteCreateRequest request)
        {
           if (!ModelState.IsValid) return ValidationProblem(ModelState);

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var newId = await con.ExecuteScalarAsync<int>(
                "sp_estudiantes_crear",
                new
                {
                    request.Nombre,
                    request.PrimerApellido,
                    request.SegundoApellido,
                    request.Activo,
                    request.IdEncargado,
                    request.IdInstitucion,
                    request.Seccion,
                    request.IdMaestra,
                    Telefono = request.Telefono!  

                },
                commandType: CommandType.StoredProcedure
            );

            var response = new EstudianteResponse(
                newId,
                request.Nombre,
                request.PrimerApellido,
                request.SegundoApellido,
                request.Activo,
                request.IdEncargado,
                request.IdInstitucion,
                request.Seccion,
                request.IdMaestra,
                request.Telefono
            );
            return CreatedAtAction(nameof(GetById), new { id = newId }, response);
        }


        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarEstudiante(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_usuarios_eliminar_logico",
                new { IdUsuario = id },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "No se encontró el usuario o ya fue eliminado." });

            return NoContent();
        }


        [HttpPatch("{id:int}/estado")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActualizarEstado(int id, [FromBody] bool activo)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_usuarios_actualizar_estado_activo",
                new { IdUsuario = id, Activo = activo },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "Usuario no encontrado o eliminado." });

            return NoContent();
        }
    }
}
