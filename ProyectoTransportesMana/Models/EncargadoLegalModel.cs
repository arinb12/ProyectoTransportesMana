using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class EncargadoLegalModel
    {
        public int IdUsuario { get; set; }

        // Datos de usuario
        [Display(Name = "Nombre")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        public string Nombre { get; set; } = "";

        [Display(Name = "Primer apellido")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        public string PrimerApellido { get; set; } = "";

        [Display(Name = "Segundo apellido")]
        public string? SegundoApellido { get; set; }

        [Display(Name = "Correo electrónico")]
        [EmailAddress(ErrorMessage = "El formato del correo no es válido.")]
        public string? Correo { get; set; }

        [Display(Name = "Activo")]
        public bool Activo { get; set; } = true;

        [Display(Name = "Contraseña")]
        [DataType(DataType.Password)]
        [Required(ErrorMessage = "La contraseña es obligatoria al registrar.")]
        public string Contrasena { get; set; } = "";

        // Datos de encargados_legales
        [Display(Name = "Dirección de residencia")]
        public string? DireccionResidencia { get; set; }

        [Display(Name = "Aceptó términos")]
        public bool?  AceptoTerminos { get; set; }

        [Display(Name = "Fecha de firma de contrato")]
        [DataType(DataType.Date)]
        public DateTime? FirmaContrato { get; set; }

        [Display(Name = "Teléfono")]
        public string? Telefono { get; set; }
    }

}
