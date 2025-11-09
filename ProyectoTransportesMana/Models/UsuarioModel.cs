using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class UsuarioModel
    {
        public int? IdUsuario { get; set; }
        public Rol RolId { get; set; }
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
    }
}
