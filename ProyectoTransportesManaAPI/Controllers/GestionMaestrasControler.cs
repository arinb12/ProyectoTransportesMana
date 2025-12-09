using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/gestion-maestras")]  // ← RUTA CAMBIADA
    public class GestionMaestrasController : ControllerBase
    {
        private readonly IConfiguration _config;

        public GestionMaestrasController(IConfiguration config)
        {
            _config = config;
        }

        // ============================================
        // LISTAR
        // ============================================
        public sealed class MaestraListDto
        {
            public int IdMaestra { get; set; }
            public string Nombre { get; set; }
            public string Seccion { get; set; }
            public bool Activo { get; set; }
        }

        [HttpGet]
        public async Task<IEnumerable<MaestraListDto>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            return await con.QueryAsync<MaestraListDto>(
                "sp_maestras_lookup_full",
                commandType: CommandType.StoredProcedure
            );
        }

        // ============================================
        // OBTENER POR ID
        // ============================================
        public sealed class MaestraDto
        {
            public int IdMaestra { get; set; }
            public string Nombre { get; set; }
            public string Seccion { get; set; }
            public bool Activo { get; set; }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<MaestraDto>> GetById(int id)
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));

            var m = await con.QuerySingleOrDefaultAsync<MaestraDto>(
                "sp_maestras_obtener",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            return m is null ? NotFound() : Ok(m);
        }

        // ============================================
        // CREAR
        // ============================================
        public sealed class CreateMaestraDto
        {
            public string Nombre { get; set; }
            public string Seccion { get; set; }
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
                    dto.Seccion
                },
                commandType: CommandType.StoredProcedure
            );

            return Created("", new { IdMaestra = newId });
        }

        // ============================================
        // EDITAR
        // ============================================
        public sealed class UpdateMaestraDto
        {
            public int IdMaestra { get; set; }
            public string Nombre { get; set; }
            public string Seccion { get; set; }
            public bool Activo { get; set; }
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
                    dto.Activo
                },
                commandType: CommandType.StoredProcedure
            );

            return rows == 0 ? NotFound() : NoContent();
        }

        // ============================================
        // ELIMINAR
        // ============================================
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