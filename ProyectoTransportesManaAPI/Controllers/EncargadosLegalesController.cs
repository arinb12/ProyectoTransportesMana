using Dapper;
using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
namespace ProyectoTransportesManaAPI.Controllers;


[ApiController]
[Route("api/v1/encargados-legales")]
public class EncargadosLegalesController : ControllerBase
{
    private readonly IConfiguration _config;
    public EncargadosLegalesController(IConfiguration config) => _config = config;

    public sealed record PersonaLookupDto(int IdUsuario, string NombreCompleto);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PersonaLookupDto>>> Get()
    {
        using var con = new SqlConnection(_config.GetConnectionString("BDConnection"));
        var data = await con.QueryAsync<PersonaLookupDto>(
            "sp_encargados_legales_lookup", commandType: CommandType.StoredProcedure);
        return Ok(data);
    }
}