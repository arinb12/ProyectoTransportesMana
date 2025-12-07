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


        [HttpPost("guardar")]
        public async Task<IActionResult> Guardar([FromBody] GuardarAsistenciaRequest request)
        {
            if (request is null)
                return BadRequest(new { Message = "Request inválido." });

            if (request.Detalles is null || request.Detalles.Count == 0)
                return BadRequest(new { Message = "No se enviaron detalles de asistencia." });

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            await con.OpenAsync();

            var dt = new DataTable();
            dt.Columns.Add("IdEstudiante", typeof(int));
            dt.Columns.Add("Estado", typeof(string));
            dt.Columns.Add("Observaciones", typeof(string));

            foreach (var d in request.Detalles)
            {
                var obs = (object?)d.Observaciones ?? DBNull.Value;
                dt.Rows.Add(d.IdEstudiante, d.Estado, obs);
            }

            using (var cmd = new SqlCommand("dbo.sp_asistencia_guardar_lote", con))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@Fecha", DBNull.Value);
                cmd.Parameters.AddWithValue("@IdInstitucion", request.IdInstitucion);
                cmd.Parameters.AddWithValue("@IdBuseta", request.IdBuseta);
                cmd.Parameters.AddWithValue("@TipoViaje", request.TipoViaje);
                cmd.Parameters.AddWithValue("@IdUsuarioRegistro", request.IdUsuarioRegistro);

                var tvpParam = cmd.Parameters.AddWithValue("@Detalles", dt);
                tvpParam.SqlDbType = SqlDbType.Structured;
                tvpParam.TypeName = "dbo.AsistenciaDetalleItemType";

                await cmd.ExecuteNonQueryAsync();
            }

            return Ok(new
            {
                IdInstitucion = request.IdInstitucion,
                IdBuseta = request.IdBuseta,
                TipoViaje = request.TipoViaje,
                TotalRegistros = request.Detalles.Count
            });
        }


        [HttpGet("estados")]
        public async Task<ActionResult<IEnumerable<AsistenciaEstadoResponse>>> GetEstados(
        [FromQuery] int institucionId,
        [FromQuery] int busetaId,
        [FromQuery] string tipoViaje)
        {
            if (institucionId <= 0 || busetaId <= 0 || string.IsNullOrWhiteSpace(tipoViaje))
                return BadRequest(new { Message = "Los parámetros institución, buseta y tipo de viaje son obligatorios." });

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryAsync<AsistenciaEstadoResponse>(
                "dbo.sp_asistencia_detalle_por_viaje",
                new
                {
                    Fecha = (DateTime?)null, // que el SP use GETDATE()
                    IdInstitucion = institucionId,
                    IdBuseta = busetaId,
                    TipoViaje = tipoViaje
                },
                commandType: CommandType.StoredProcedure
            );

            return Ok(data);
        }
    }
}