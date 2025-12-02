using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Estudiantes;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Authorize]
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
                    Telefono = request.Telefono!,
                    Busetas = string.Join(",", request.Busetas ?? new())

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


        [HttpPut("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActualizarEstudiante(int id, [FromBody] EstudianteUpdateRequest request)
        {
            if (id != request.Id)
                return BadRequest(new { Message = "El ID del estudiante no coincide." });

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var rows = await con.ExecuteAsync(
                "sp_estudiantes_actualizar",
                new
                {
                    request.Id,
                    request.Nombre,
                    request.PrimerApellido,
                    request.SegundoApellido,
                    request.Activo,
                    request.IdEncargado,
                    request.IdInstitucion,
                    request.Seccion,
                    request.IdMaestra,
                    request.Telefono
                },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "Estudiante no encontrado." });

            return NoContent();
        }

        [HttpGet("{id:int}/busetas")]
        public async Task<ActionResult<IEnumerable<int>>> GetBusetasDeEstudiante(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var ids = await con.QueryAsync<int>(
                "SELECT id_buseta FROM asignacion_estudiantes_buseta WHERE id_estudiante = @Id",
                new { Id = id }
            );
            return Ok(ids);
        }

        [HttpPut("{id:int}/busetas")]
        public async Task<IActionResult> ActualizarBusetas(int id, [FromBody] List<int> busetas)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var csv = string.Join(",", busetas ?? new());
            await con.ExecuteAsync("sp_estudiante_actualizar_busetas", new { IdEstudiante = id, Busetas = csv }, commandType: CommandType.StoredProcedure);
            return NoContent();
        }

        [HttpGet("por-encargado/{idEncargado:int}")]
        [ProducesResponseType(typeof(IEnumerable<EstudianteListItemResponse>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<EstudianteListItemResponse>>> GetPorEncargado(int idEncargado)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryAsync<EstudianteListItemResponse>(
                "sp_estudiantes_listar_por_encargado",
                new { IdEncargado = idEncargado },
                commandType: CommandType.StoredProcedure
            );

            return Ok(data);
        }


    }
}
