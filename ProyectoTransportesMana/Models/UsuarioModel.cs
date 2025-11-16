using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ProyectoTransportesMana.Models
{
    public class UsuarioModel
    {
        public int? IdUsuario { get; set; }
        public int RolId { get; set; }
        [Display(Name = "Nombre")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        public string Nombre { get; set; } = "";
        [Display(Name = "Primer apellido")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        public string PrimerApellido { get; set; } = "";

        [Display(Name = "Segundo apellido")]
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public string ContrasenaHash { get; set; } = "";
        public DateTime FechaRegistro { get; set; }
        [Display(Name = "Activo")]
        public bool Activo { get; set; }

        [JsonPropertyName("nombre_rol")]
        public string NombreRol { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
