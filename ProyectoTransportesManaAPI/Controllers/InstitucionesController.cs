using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;
using System.Data;
namespace ProyectoTransportesManaAPI.Controllers

{
    [ApiController]
    [Route("api/v1/instituciones")]
    public class InstitucionesController : ControllerBase
    {
        private readonly IConfiguration _config;
        public InstitucionesController(IConfiguration config) => _config = config;

        public sealed record InstitucionLookupDto(int IdInstitucion, string Nombre);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InstitucionLookupDto>>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<InstitucionLookupDto>(
                "sp_instituciones_lookup", commandType: CommandType.StoredProcedure);
            return Ok(data);
        }

        [HttpGet("{id}/estudiantes")]
        public async Task<IActionResult> GetEstudiantesPorInstitucion(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<EstudianteDto>(
                "ConsultarEstudiantesPorInstitucion",
                new { IdInstitucion = id },
                commandType: CommandType.StoredProcedure);
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] InstitucionLookupDto dto)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var newId = await con.ExecuteScalarAsync<int>("Instituciones_Insert",
                new { Nombre = dto.Nombre }, commandType: CommandType.StoredProcedure);
            return CreatedAtAction(nameof(Get), new { id = newId }, new { IdInstitucion = newId });
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] InstitucionLookupDto dto)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            await con.ExecuteAsync("Instituciones_Update", new { IdInstitucion = id, Nombre = dto.Nombre }, commandType: CommandType.StoredProcedure);
            return NoContent();
        }


        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            await con.ExecuteAsync("Instituciones_Delete", new { IdInstitucion = id }, commandType: CommandType.StoredProcedure);
            return NoContent();
        }
    }
}

