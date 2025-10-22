using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AsistenteController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        public AsistenteController(IConfiguration configuration) => _configuration = configuration;

        [HttpGet("Busetas")]
        public async Task<IActionResult> GetBusetas()
        {
            var sql = @"
                SELECT b.id_buseta AS Id,
                       CONCAT('Buseta - ', b.placa) AS Texto
                FROM dbo.busetas b
                ORDER BY b.placa;";

            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var lista = await con.QueryAsync<BusetaDto>(sql);
            return Ok(lista);
        }

    
        [HttpGet("Listar")]
        public async Task<IActionResult> Listar()
        {
            const string sql = @"
                SELECT *
                FROM dbo.vw_asistentes_listado
                ORDER BY Nombre, PrimerApellido;";

            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var lista = await con.QueryAsync<AsistenteListItemResponse>(sql);
            return Ok(lista);
        }

        [HttpPost("RegistrarAsistente")]
        public async Task<IActionResult> RegistrarAsistente([FromBody] AsistenteModel asistente)
        {
            if (asistente is null) return BadRequest("Payload vacío.");

            try
            {
                using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

                var parametros = new DynamicParameters();
                parametros.Add("@Nombre", asistente.Nombre);
                parametros.Add("@PrimerApellido", asistente.PrimerApellido);
                parametros.Add("@SegundoApellido", asistente.SegundoApellido);
                parametros.Add("@Activo", asistente.Activo);
                parametros.Add("@Telefono", asistente.Telefono);
                parametros.Add("@Cedula", asistente.Cedula);
                parametros.Add("@Correo", asistente.Correo);
                parametros.Add("@Salario", asistente.Salario);
                parametros.Add("@IdBuseta", asistente.BusetaId);

                // SP devuelve SELECT @NewUserId AS Id
                var newId = await con.QuerySingleAsync<int>(
                    "dbo.sp_asistentes_crear",
                    parametros,
                    commandType: CommandType.StoredProcedure
                );

                return Created(string.Empty, new { Id = newId });
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
