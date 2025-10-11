using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class EstudianteModel : UsuarioModel
    {
        [Display(Name = "Encargado legal")]
        [Required(ErrorMessage = "Debe seleccionar un {0}.")]
        public int IdEncargado { get; set; }

        [Display(Name = "Institución")]
        [Required(ErrorMessage = "Debe seleccionar una {0}.")]
        public int IdInstitucion { get; set; }

        [Display(Name = "Sección")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        public string? Seccion { get; set; }

        [Display(Name = "Maestra")]
        [Required(ErrorMessage = "Debe seleccionar una {0}")]
        public int IdMaestra { get; set; }

        [Display(Name = "Teléfono")]
        [Required(ErrorMessage = "El campo {0} es obligatorio.")]
        [RegularExpression(@"^(\+506[\s]?)?\d{4}-\d{4}$", ErrorMessage = "Formato de teléfono inválido. Use ####-#### o +506 ####-####.")]
        public string? Telefono { get; set; }

        public EncargadoLegalModel? Encargado { get; set; }
        public InstitucionModel? Institucion { get; set; }
        public MaestraModel? Maestra { get; set; }
    }
}
