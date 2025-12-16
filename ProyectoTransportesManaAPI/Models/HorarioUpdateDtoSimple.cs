namespace ProyectoTransportesManaAPI.Models
{
    public class HorarioUpdateDtoSimple
    {
        public int IdEstudiante { get; set; }
        public string DiaSemana { get; set; } = "";
        public string? HoraEntrada { get; set; }
        public string? HoraSalida { get; set; }
    }
}
