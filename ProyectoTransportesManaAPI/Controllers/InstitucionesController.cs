using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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
    }
}
