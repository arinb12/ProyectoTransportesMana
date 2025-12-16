using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class HorarioDiaViewModel
    {
        public int IdHorario { get; set; }     
        public int DiaSemana { get; set; }      

        [Display(Name = "Hora de entrada")]
        [DataType(DataType.Time)]
        public TimeSpan? HoraEntrada { get; set; }

        [Display(Name = "Hora de salida")]
        [DataType(DataType.Time)]
        public TimeSpan? HoraSalida { get; set; }
    }
}
