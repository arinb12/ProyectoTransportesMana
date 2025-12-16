namespace ProyectoTransportesManaAPI.Models
{
    public class HorarioListItemResponse
    {
        public int IdHorario { get; set; }
        public int IdEstudiante { get; set; }
        public string DiaSemana { get; set; } = "";
        public TimeSpan HoraEntrada { get; set; }
        public TimeSpan HoraSalida { get; set; }
    }
}
