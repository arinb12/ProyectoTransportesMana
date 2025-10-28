using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesManaAPI.Models
{
    public class DatosUsuarioResponseModel
    {

        public int IdUsuario { get; set; }
        public int RolId { get; set; }
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public string ContrasenaHash { get; set; } = "";
        public DateTime FechaRegistro { get; set; }
        public bool Activo { get; set; }
    }
}
