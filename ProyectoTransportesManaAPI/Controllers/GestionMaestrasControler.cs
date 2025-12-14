using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/gestion-maestras")]
    public class GestionMaestrasController : ControllerBase
    {
        private readonly IConfiguration _config;

        public GestionMaestrasController(IConfiguration config)
        {
            _config = config;
        }

        public sealed record MaestraDto(
            int IdMaestra,
            string Nombre,
            int IdInstitucion,
            string Institucion,
            string Seccion,
            bool Activo
        );

        public sealed class CreateMaestraDto
        {
            public string Nombre { get; set; } = "";
            public int IdInstitucion { get; set; }
            public string Seccion { get; set; } = "";
        }

        public sealed class UpdateMaestraDto
        {
            public int IdMaestra { get; set; }
            public string Nombre { get; set; } = "";
            public int IdInstitucion { get; set; }
            public string Seccion { get; set; } = "";
            public bool Activo { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryAsync<MaestraDto>(
                "sp_maestras_lookup_full",
                commandType: CommandType.StoredProcedure
            );

            return Ok(data);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var data = await con.QueryFirstOrDefaultAsync<MaestraDto>(
                "sp_maestras_obtener",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateMaestraDto dto)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var newId = await con.ExecuteScalarAsync<int>(
                "sp_maestras_crear",
                new
                {
                    dto.Nombre,
                    dto.Seccion,
                    dto.IdInstitucion
                },
                commandType: CommandType.StoredProcedure
            );

            return Created("", new { IdMaestra = newId });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateMaestraDto dto)
        {
            if (id != dto.IdMaestra)
                return BadRequest("ID no coincide");

            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_maestras_actualizar",
                new
                {
                    dto.IdMaestra,
                    dto.Nombre,
                    dto.Seccion,
                    dto.Activo,
                    dto.IdInstitucion
                },
                commandType: CommandType.StoredProcedure
            );

            return rows == 0 ? NotFound() : NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_maestras_eliminar_logico",
                new { IdMaestra = id },
                commandType: CommandType.StoredProcedure
            );

            return rows == 0 ? NotFound() : NoContent();
        }
    }
}
