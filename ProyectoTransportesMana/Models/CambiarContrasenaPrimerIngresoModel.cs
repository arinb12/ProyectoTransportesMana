using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class CambiarContrasenaPrimerIngresoModel
    {
        public int IdUsuario { get; set; }

        [Required(ErrorMessage = "La nueva contraseña es obligatoria.")]
        [DataType(DataType.Password)]
        [Display(Name = "Nueva contraseña")]
        public string NuevaContrasena { get; set; } = string.Empty;

        [Required(ErrorMessage = "Debe confirmar la contraseña.")]
        [DataType(DataType.Password)]
        [Display(Name = "Confirmar contraseña")]
        [Compare("NuevaContrasena", ErrorMessage = "Las contraseñas no coinciden.")]
        public string ConfirmarContrasena { get; set; } = string.Empty;

        [Display(Name = "Acepto los términos y condiciones")]
        [Range(typeof(bool), "true", "true", ErrorMessage = "Debe aceptar los términos para continuar.")]
        public bool AceptoTerminos { get; set; }
    }
}
