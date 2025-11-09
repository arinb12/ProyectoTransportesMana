using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;
namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/maestras")]
    public class MaestrasController : ControllerBase
    {
        private readonly IConfiguration _config;
        public MaestrasController(IConfiguration config) => _config = config;

        public sealed record PersonaLookupDto(int IdUsuario, string NombreCompleto);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PersonaLookupDto>>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<PersonaLookupDto>(
                "sp_maestras_lookup", commandType: CommandType.StoredProcedure);
            return Ok(data);
        }
    }
}
