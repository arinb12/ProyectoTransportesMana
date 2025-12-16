using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Perfil;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/perfil")]
    public class PerfilController : ControllerBase
    {
        private readonly IConfiguration _config;
        public PerfilController(IConfiguration config) => _config = config;

        private SqlConnection GetConn()
            => new SqlConnection(_config.GetConnectionString("BDConnection"));

        [HttpGet("{idUsuario:int}")]
        public async Task<IActionResult> Obtener(int idUsuario)
        {
            using var con = GetConn();
            var p = new DynamicParameters();
            p.Add("@id_usuario", idUsuario, DbType.Int32);

            var row = await con.QueryFirstOrDefaultAsync<dynamic>(
                "dbo.sp_perfil_obtener",
                p,
                commandType: CommandType.StoredProcedure);

            if (row is null) return NotFound(new { ok = false, message = "Perfil no encontrado" });

            var perfil = new PerfilResponse
            {
                IdUsuario = row.id_usuario,
                RolId = row.rol_id,
                Nombre = row.nombre,
                PrimerApellido = row.primer_apellido,
                SegundoApellido = row.segundo_apellido,
                Correo = row.correo,
                Telefono = row.telefono,
                FotoPerfil = row.foto_perfil
            };

            return Ok(perfil);
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] PerfilUpdateRequest req)
        {
            if (req is null || req.IdUsuario <= 0) return BadRequest(new { ok = false, message = "Payload inválido" });
            if (string.IsNullOrWhiteSpace(req.Correo)) return BadRequest(new { ok = false, message = "Correo es requerido" });

            using var con = GetConn();

            var p = new DynamicParameters();
            p.Add("@id_usuario", req.IdUsuario, DbType.Int32);
            p.Add("@correo", req.Correo, DbType.String);
            p.Add("@telefono", req.Telefono, DbType.String);
            p.Add("@foto_perfil", req.FotoPerfil, DbType.String);

            var ok = await con.QueryFirstOrDefaultAsync<int>(
                "dbo.sp_perfil_actualizar",
                p,
                commandType: CommandType.StoredProcedure);

            if (ok != 1) return NotFound(new { ok = false, message = "No se pudo actualizar" });

            return Ok(new { ok = true });
        }
    }
}
