using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Asistencia;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/asistencia")]
    public class AsistenciaController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AsistenciaController(IConfiguration config) => _config = config;

        [HttpGet("estudiantes")]
        public async Task<ActionResult<IEnumerable<AsistenciaEstudianteListItemResponse>>> GetEstudiantes(
            [FromQuery] int institucionId,
            [FromQuery] int busetaId)
        {
            if (institucionId <= 0 || busetaId <= 0)
                return BadRequest(new { Message = "Los parámetros de institución y buseta son obligatorios." });

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryAsync<AsistenciaEstudianteListItemResponse>(
                "sp_asistencia_estudiantes_por_institucion_buseta",
                new { IdInstitucion = institucionId, IdBuseta = busetaId },
                commandType: CommandType.StoredProcedure
            );

            return Ok(data);
        }
    }
}