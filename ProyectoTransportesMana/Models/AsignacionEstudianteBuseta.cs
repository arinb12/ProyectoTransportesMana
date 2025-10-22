using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class AsignacionEstudianteBuseta
    {
        [Key]
        [Display(Name = "ID Asignación")]
        public int IdAsignacion { get; set; }

        [Required(ErrorMessage = "El ID del estudiante es obligatorio")]
        [Display(Name = "ID Estudiante")]
        public int IdEstudiante { get; set; }

        [Required(ErrorMessage = "El ID de la buseta es obligatorio")]
        [Display(Name = "ID Buseta")]
        public int IdBuseta { get; set; }

        [Display(Name = "Fecha de Asignación")]
        public DateTime FechaAsignacion { get; set; } = DateTime.Now;

        [Display(Name = "Estado")]
        public bool Activa { get; set; } = true;

        // Propiedades de navegación (opcional, para mostrar información relacionada)
        public virtual EstudianteModel Estudiante { get; set; }
        public virtual Buseta Buseta { get; set; }
    }
}

