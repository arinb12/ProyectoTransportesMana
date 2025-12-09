using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/horarios")]
    public class HorariosController : ControllerBase
    {
        private readonly IConfiguration _config;
        public HorariosController(IConfiguration config) => _config = config;

        [HttpPut]
        public async Task<IActionResult> UpdateHorario([FromBody] HorarioUpdateDtoSimple dto)
        {
            if (dto == null) return BadRequest("Datos inválidos.");

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var parameters = new DynamicParameters();
            parameters.Add("@IdHorario", dbType: DbType.Int32, value: null);
            parameters.Add("@IdEstudiante", dto.IdEstudiante);
            parameters.Add("@DiaSemana", dto.DiaSemana);
            parameters.Add("@HoraEntradaText", dto.HoraEntrada);
            parameters.Add("@HoraSalidaText", dto.HoraSalida);

            try
            {
                await con.ExecuteAsync("Horarios_Insert_Update", parameters, commandType: CommandType.StoredProcedure);
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error guardando horario.");
            }
        }
    }
}