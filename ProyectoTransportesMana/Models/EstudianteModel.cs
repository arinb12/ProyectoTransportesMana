using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class EstudianteModel : UsuarioModel
    {
        [Display(Name = "Encargado legal")]
        [Required]
        public int IdEncargado { get; set; }

        [Display(Name = "Institución")]
        [Required]
        public int IdInstitucion { get; set; }

        [Display(Name = "Sección")]
        public string? Seccion { get; set; }

        [Display(Name = "Maestra")]
        [Required]
        public int IdMaestra { get; set; }

        public EncargadoLegalModel? Encargado { get; set; }
        public InstitucionModel? Institucion { get; set; }
        public MaestraModel? Maestra { get; set; }
    }
}
