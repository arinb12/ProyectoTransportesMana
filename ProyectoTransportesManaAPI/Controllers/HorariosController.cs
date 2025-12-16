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
        public async Task<IActionResult> UpdateHorario([FromBody] HorarioUpdateDtoSimple? dto)
        {
            if (dto is null)
                return StatusCode(StatusCodes.Status400BadRequest, "Datos inválidos.");

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var parameters = new DynamicParameters();
            parameters.Add("@IdHorario", dto.IdHorario, DbType.Int32);
            parameters.Add("@IdEstudiante", dto.IdEstudiante);
            parameters.Add("@DiaSemana", dto.DiaSemana);
            parameters.Add("@HoraEntradaText", dto.HoraEntrada);
            parameters.Add("@HoraSalidaText", dto.HoraSalida);

            try
            {
                await con.ExecuteAsync(
                    "Horarios_Insert_Update",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                return NoContent();
            }
            catch
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "Error guardando horario.");
            }
        }

        [HttpGet("por-estudiante/{idEstudiante:int}")]
        public async Task<ActionResult<IEnumerable<HorarioListItemResponse>>> GetPorEstudiante(int idEstudiante)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryAsync<HorarioListItemResponse>(
                "Horarios_ListarPorEstudiante",
                new { IdEstudiante = idEstudiante },
                commandType: CommandType.StoredProcedure
            );

            return Ok(data);
        }


    }
}