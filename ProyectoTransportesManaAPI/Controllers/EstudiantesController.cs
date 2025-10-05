using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using ProyectoTransportesMana.Contracts.Estudiantes;
using System.Data;

namespace ProyectoTransportesManaAPI.Controllers
{
    [ApiController]
    [Route("api/v1/estudiantes")]
    public class EstudiantesController : ControllerBase
    {
        private readonly IConfiguration _config;
        public EstudiantesController(IConfiguration config) => _config = config;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EstudianteListItemResponse>>> Get()
        {
            using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
            var data = await con.QueryAsync<EstudianteListItemResponse>(
                "sp_estudiantes_listar",
                commandType: CommandType.StoredProcedure
            );
            return Ok(data);
        }   


        [HttpPost]
        public async Task<IActionResult> RegistrarEstudiante([FromBody] EstudianteCreateRequest request)
        {
            return Ok();
        }
    }
}
