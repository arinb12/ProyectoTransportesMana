using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class Buseta
    {
        [Key]
        [Display(Name = "ID Buseta")]
        public int Id { get; set; }

        [Required(ErrorMessage = "La placa es obligatoria")]
        [Display(Name = "Placa")]
        [StringLength(10, ErrorMessage = "La placa no puede exceder 10 caracteres")]
        public string Placa { get; set; }

        [Required(ErrorMessage = "La capacidad es obligatoria")]
        [Display(Name = "Capacidad")]
        [Range(1, 50, ErrorMessage = "La capacidad debe estar entre 1 y 50 pasajeros")]
        public int Capacidad { get; set; }

        [Required(ErrorMessage = "El nombre del conductor es obligatorio")]
        [Display(Name = "Nombre del Conductor")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        public string NombreConductor { get; set; }

        [Required(ErrorMessage = "La jornada es obligatoria")]
        [Display(Name = "Jornada")]
        [StringLength(20, ErrorMessage = "La jornada no puede exceder 20 caracteres")]
        public string Jornada { get; set; }

        [Required(ErrorMessage = "El horario de servicio es obligatorio")]
        [Display(Name = "Horario de Servicio")]
        [StringLength(50, ErrorMessage = "El horario no puede exceder 50 caracteres")]
        public string HorarioServicio { get; set; }

        [Display(Name = "Estado")]
        public bool Activa { get; set; } = true;

        [Required(ErrorMessage = "La cédula del conductor es obligatoria")]
        [Display(Name = "Cédula del Conductor")]
        [StringLength(20, ErrorMessage = "La cédula no puede exceder 20 caracteres")]
        public string CedulaConductor { get; set; }

        // Propiedad calculada para mostrar el estado
        [Display(Name = "Estado")]
        public string EstadoTexto => Activa ? "Activa" : "Inactiva";
    }
}
