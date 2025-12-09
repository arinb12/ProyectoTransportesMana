using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesManaAPI.Models;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlertaController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        public AlertaController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // POST api/alerta
        // Crear alerta (usa sp_alertas_insertar)
        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] CrearAlertaDto dto)
        {
            if (dto is null) return BadRequest(new { ok = false, message = "Payload vacío" });

            try
            {
                using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
                var p = new DynamicParameters();
                p.Add("@enviado_por", dto.EnviadoPor, DbType.Int32);
                p.Add("@titulo", dto.Titulo, DbType.String);
                p.Add("@tipo_alerta", dto.TipoAlerta, DbType.String);
                p.Add("@mensaje", dto.Mensaje, DbType.String);
                p.Add("@publico_destino", dto.PublicoDestino, DbType.String);
                p.Add("@fecha_publicacion", dto.FechaPublicacion, DbType.DateTime);

                var id = await con.QuerySingleAsync<int>("dbo.sp_alertas_insertar", p, commandType: CommandType.StoredProcedure);
                return Ok(new { ok = true, id_alerta = id });
            }
            catch (SqlException sqlEx)
            {
                // devuelve detalle mínimo para debug (opcional en dev)
                return StatusCode(500, new { ok = false, message = "Error guardando alerta", detail = sqlEx.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = "Error guardando alerta", detail = ex.Message });
            }
        }

        // GET api/alerta/busetas  -> lista de busetas para dropdown
        [HttpGet("busetas")]
        public async Task<IActionResult> GetBusetas()
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var sql = @"SELECT id_buseta AS Id, placa AS Placa, CONCAT('Buseta - ', placa) AS Texto 
                        FROM dbo.busetas
                        WHERE activa = 1
                        ORDER BY placa;";
            var lista = await con.QueryAsync(sql);
            return Ok(lista);
        }

        // GET api/alerta/encargados -> lista de encargados (usuarios encargados_legales)
        [HttpGet("encargados")]
        public async Task<IActionResult> GetEncargados()
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var sql = @"SELECT el.id_encargado AS IdUsuario,
                               u.nombre + ' ' + u.primer_apellido + ISNULL(' ' + u.segundo_apellido, '') AS NombreCompleto
                        FROM dbo.encargados_legales el
                        JOIN dbo.usuarios u ON u.id_usuario = el.id_encargado
                        ORDER BY u.nombre, u.primer_apellido;";
            var lista = await con.QueryAsync(sql);
            return Ok(lista);
        }

        // GET api/alerta/user/{userId}/today  -> alertas para usuario (usa sp_alertas_para_usuario)
        [HttpGet("user/{userId}/today")]
        public async Task<IActionResult> GetAlertasParaUsuarioHoy(int userId)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

            // obtener id_buseta desde asistentes (si el usuario es un asistente)
            var idBusetaObj = await con.QueryFirstOrDefaultAsync<int?>(
                "SELECT a.id_buseta FROM dbo.asistentes a WHERE a.id_asistente = @id",
                new { id = userId }
            );
            string idBuseta = idBusetaObj?.ToString();

            var p = new DynamicParameters();
            p.Add("@IdUsuario", userId, DbType.Int32);
            p.Add("@IdBuseta", idBuseta, DbType.String);

            var rows = await con.QueryAsync("dbo.sp_alertas_para_usuario", p, commandType: CommandType.StoredProcedure);
            return Ok(rows);
        }

        // GET api/alerta/user/{userId}/count  -> cuenta para badge
        [HttpGet("user/{userId}/count")]
        public async Task<IActionResult> GetCountAlertasParaUsuarioHoy(int userId)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

            // obtener id_buseta desde asistentes (si el usuario es un asistente)
            var idBusetaObj = await con.QueryFirstOrDefaultAsync<int?>(
                "SELECT a.id_buseta FROM dbo.asistentes a WHERE a.id_asistente = @id",
                new { id = userId }
            );
            string idBuseta = idBusetaObj?.ToString();

            var p = new DynamicParameters();
            p.Add("@IdUsuario", userId, DbType.Int32);
            p.Add("@IdBuseta", idBuseta, DbType.String);

            var rows = await con.QueryAsync("dbo.sp_alertas_para_usuario", p, commandType: CommandType.StoredProcedure);
            var count = rows?.Count() ?? 0;
            return Ok(new { count });
        }

        // GET api/alerta/listar  -> listar todas (útil para la vista de administración)
        [HttpGet("listar")]
        public async Task<IActionResult> ListarTodas()
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var rows = await con.QueryAsync("dbo.sp_alertas_listar", commandType: CommandType.StoredProcedure);
            return Ok(rows);
        }

        // DELETE api/alerta/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAlert(int id)
        {
            if (id <= 0) return BadRequest(new { ok = false, message = "Id inválido" });

            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            try
            {
                var rows = await con.ExecuteAsync("DELETE FROM alertas WHERE id_alerta = @id", new { id });
                if (rows > 0) return Ok(new { ok = true });
                return NotFound(new { ok = false, message = "Alerta no encontrada" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = "Error eliminando alerta", detail = ex.Message });
            }
        }

        // -----------------------
        // RUTAS ADICIONALES AGREGADAS
        // -----------------------

        // GET api/alerta
        // Alias simple para listar alertas (puede ser útil si el frontend solicita /api/alerta con GET)
        [HttpGet]
        public async Task<IActionResult> GetAllAlias()
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            var rows = await con.QueryAsync("dbo.sp_alertas_listar", commandType: CommandType.StoredProcedure);
            return Ok(rows);
        }

        // GET api/alerta/{id}
        // Obtener detalle de una alerta por id (útil para edición/ver)
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));
            try
            {
                var sql = "SELECT * FROM dbo.alertas WHERE id_alerta = @id";
                var row = await con.QueryFirstOrDefaultAsync(sql, new { id });
                if (row == null) return NotFound(new { ok = false, message = "Alerta no encontrada" });
                return Ok(row);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, message = "Error consultando alerta", detail = ex.Message });
            }
        }

        // GET api/alerta/user/{userId}
        // Alias que llama al mismo procedimiento que /today (por si el frontend pide /api/alerta/user/{id})
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetAlertasParaUsuario(int userId)
        {
            using var con = new SqlConnection(_configuration.GetConnectionString("BDConnection"));

            var idBusetaObj = await con.QueryFirstOrDefaultAsync<int?>(
                "SELECT a.id_buseta FROM dbo.asistentes a WHERE a.id_asistente = @id",
                new { id = userId }
            );
            string idBuseta = idBusetaObj?.ToString();

            var p = new DynamicParameters();
            p.Add("@IdUsuario", userId, DbType.Int32);
            p.Add("@IdBuseta", idBuseta, DbType.String);

            var rows = await con.QueryAsync("dbo.sp_alertas_para_usuario", p, commandType: CommandType.StoredProcedure);
            return Ok(rows);
        }
    }
}
