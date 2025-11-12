namespace ProyectoTransportesManaAPI.Models
{
    public record InstitucionLookupDto(int IdInstitucion, string Nombre);

    public class EstudianteDto
    {
        public int IdEstudiante { get; init; }
        public string Seccion { get; init; } = "";
        public int? IdUsuario { get; init; }
        public string NombreCompleto { get; init; } = "";
        public int IdInstitucion { get; init; }
        public string NombreInstitucion { get; init; } = "";
        public string DiaSemana { get; init; } = "";
        public TimeSpan? HoraEntrada { get; init; }
        public TimeSpan? HoraSalida { get; init; }
    }

    public class HorarioUpdateDto
    {
        public int IdEstudiante { get; set; }
        public string DiaSemana { get; set; } = "";
        public TimeSpan HoraEntrada { get; set; }
        public TimeSpan HoraSalida { get; set; }
    }
}