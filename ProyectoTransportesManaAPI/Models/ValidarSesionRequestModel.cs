using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesManaAPI.Models
{
    public class ValidarSesionRequestModel
    {
        [Required]
        public string Correo { get; set; } = string.Empty;
        [Required]
        public string ContrasenaHash { get; set; } = string.Empty;
    }
}
