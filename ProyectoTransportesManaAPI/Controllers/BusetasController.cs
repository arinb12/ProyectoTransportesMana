using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Busetas;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/busetas")]
    public class BusetasController : ControllerBase
    {
        private readonly IConfiguration _config;
        public BusetasController(IConfiguration config) => _config = config;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusetaListItemResponse>>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<BusetaListItemResponse>(
                "sp_busetas_listar_asistente",
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(BusetaResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<BusetaResponse>> GetById(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var buseta = await con.QuerySingleOrDefaultAsync<BusetaResponse>(
                "sp_busetas_obtener",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            return buseta is null ? NotFound() : Ok(buseta);
        }

        [HttpPost]
        [ProducesResponseType(typeof(BusetaResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<BusetaResponse>> CrearBuseta([FromBody] BusetaCreateRequest request)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var newId = await con.ExecuteScalarAsync<int>(
                "sp_busetas_crear",
                new
                {
                    request.Placa,
                    request.Capacidad,
                    request.NombreConductor,
                    request.Jornada,
                    request.HorarioServicio,
                    request.Activa,
                    request.CedulaConductor
                },
                commandType: CommandType.StoredProcedure
            );

            var response = new BusetaResponse(
                newId,
                request.Placa,
                request.Capacidad,
                request.NombreConductor,
                request.Jornada,
                request.HorarioServicio,
                request.Activa,
                request.CedulaConductor
            );
            return CreatedAtAction(nameof(GetById), new { id = newId }, response);
        }

        [HttpPut("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActualizarBuseta(int id, [FromBody] BusetaUpdateRequest request)
        {
            if (id != request.Id)
                return BadRequest(new { Message = "El ID de la buseta no coincide." });

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var rows = await con.ExecuteAsync(
                "sp_busetas_actualizar",
                new
                {
                    request.Id,
                    request.Placa,
                    request.Capacidad,
                    request.NombreConductor,
                    request.Jornada,
                    request.HorarioServicio,
                    request.Activa,
                    request.CedulaConductor
                },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "Buseta no encontrada." });

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarBuseta(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_busetas_eliminar_logico",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "No se encontró la buseta o ya fue eliminada." });

            return NoContent();
        }

        [HttpGet("{id:int}/asignaciones")]
        [ProducesResponseType(typeof(IEnumerable<AsignacionEstudianteBusetaResponse>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<AsignacionEstudianteBusetaResponse>>> GetAsignaciones(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<AsignacionEstudianteBusetaResponse>(
                "sp_busetas_asignaciones_obtener",
                new { IdBuseta = id },
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }

        [HttpGet("activas")]
        [ProducesResponseType(typeof(IEnumerable<BusetaListItemResponse>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<BusetaListItemResponse>>> GetActivas()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<BusetaListItemResponse>(
                "sp_busetas_listar_activas",
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }

        [HttpGet("con-asignaciones")]
        [ProducesResponseType(typeof(IEnumerable<BusetaConAsignacionesResponse>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<BusetaConAsignacionesResponse>>> GetConAsignaciones()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<BusetaConAsignacionesResponse>(
                "sp_busetas_con_asignaciones",
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }

        [HttpPost("{idBuseta:int}/asignaciones")]
        [ProducesResponseType(typeof(AsignacionEstudianteBusetaResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AsignacionEstudianteBusetaResponse>> CrearAsignacion(int idBuseta, [FromBody] AsignacionEstudianteBusetaCreateRequest request)
        {
            if (idBuseta != request.IdBuseta)
                return BadRequest(new { Message = "El ID de la buseta no coincide." });

            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var newId = await con.ExecuteScalarAsync<int>(
                "sp_asignacion_estudiante_buseta_crear",
                new
                {
                    request.IdEstudiante,
                    request.IdBuseta
                },
                commandType: CommandType.StoredProcedure
            );

            var response = new AsignacionEstudianteBusetaResponse(
                newId,
                request.IdEstudiante,
                request.IdBuseta,
                DateTime.Now,
                true
            );
            return CreatedAtAction(nameof(GetAsignaciones), new { id = idBuseta }, response);
        }

        [HttpDelete("asignaciones/{idAsignacion:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarAsignacion(int idAsignacion)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_asignacion_estudiante_buseta_eliminar_logico",
                new { IdAsignacion = idAsignacion },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "No se encontró la asignación o ya fue eliminada." });

            return NoContent();
        }
    }
}
