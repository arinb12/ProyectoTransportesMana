using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProyectoTransportesManaAPI.Models
{
    public class DatosUsuarioResponseModel
    {
        public int IdUsuario { get; set; }
        public int RolId { get; set; }
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; } = string.Empty;
        public string? Correo { get; set; } = string.Empty;
        public string ContrasenaHash { get; set; } = "";
        public DateTime FechaRegistro { get; set; }
        public bool Activo { get; set; }
        [JsonPropertyName("nombre_rol")]
        public string NombreRol { get; set; }  = string.Empty;


    }
}
