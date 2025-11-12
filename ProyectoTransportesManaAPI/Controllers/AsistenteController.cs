using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;
using System.Data;
using System.Net.Http;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AsistenteController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        public AsistenteController(IConfiguration configuration)
        {
            _configuration = configuration;
        }
        [HttpGet("Busetas")]
        public async Task<IActionResult> GetBusetas()
        {
            const string sql = @"
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


        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var row = await con.QuerySingleOrDefaultAsync<AsistenteDetalleRow>(
                "dbo.sp_asistentes_obtener",
                new { Id = id },
                commandType: CommandType.StoredProcedure
            );

            if (row is null) return NotFound();


            var res = new AsistenteResponse
            {
                Id = row.Id,
                Nombre = row.Nombre,
                PrimerApellido = row.PrimerApellido,
                SegundoApellido = row.SegundoApellido,
                Activo = row.Activo,
                BusetaId = row.BusetaId,
                Telefono = row.Telefono,
                Cedula = row.Cedula,
                Correo = row.Correo,
                Salario = (int)Math.Round(row.Salario)
            };

            return Ok(res);
        }

        [HttpPost("RegistrarAsistente")]
        public async Task<IActionResult> RegistrarAsistente([FromBody] AsistenteModel asistente)
        {
            if (asistente is null) return BadRequest("Payload vacío.");

            try
            {
                using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

                var p = new DynamicParameters();
                p.Add("@Nombre", asistente.Nombre);
                p.Add("@PrimerApellido", asistente.PrimerApellido);
                p.Add("@SegundoApellido", asistente.SegundoApellido);
                p.Add("@Activo", asistente.Activo);
                p.Add("@Telefono", asistente.Telefono);
                p.Add("@Cedula", asistente.Cedula);
                p.Add("@Correo", asistente.Correo);
                p.Add("@Salario", asistente.Salario);
                p.Add("@IdBuseta", asistente.BusetaId);

                var newId = await con.QuerySingleAsync<int>(
                    "dbo.sp_asistentes_crear",
                    p,
                    commandType: CommandType.StoredProcedure
                );

                return Created(string.Empty, new { Id = newId });
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Actualizar(int id, [FromBody] AsistenteUpdateRequest req)
        {
            if (id != req.Id) return BadRequest(new { message = "El id de la ruta no coincide con el cuerpo." });

            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var p = new DynamicParameters();
            p.Add("@Id", req.Id);
            p.Add("@Nombre", req.Nombre);
            p.Add("@PrimerApellido", req.PrimerApellido);
            p.Add("@SegundoApellido", req.SegundoApellido);
            p.Add("@Activo", req.Activo);
            p.Add("@Telefono", req.Telefono);
            p.Add("@Cedula", req.Cedula);
            p.Add("@Correo", req.Correo);
            p.Add("@Salario", req.Salario);
            p.Add("@IdBuseta", req.BusetaId);

            try
            {
                var rows = await con.ExecuteAsync(
                    "dbo.sp_asistentes_actualizar",
                    p,
                    commandType: CommandType.StoredProcedure
                );

                if (rows == 0)
                    return NotFound(new { message = "Asistente no encontrado." });

                return NoContent();
            }
            catch (SqlException ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarEstudiante(int id)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

            var rows = await con.ExecuteAsync(
                "sp_usuarios_eliminar_logico",
                new { IdUsuario = id },
                commandType: CommandType.StoredProcedure
            );

            if (rows == 0)
                return NotFound(new { Message = "No se encontró el usuario o ya fue eliminado." });

            return NoContent();
        }
    }
}

 
