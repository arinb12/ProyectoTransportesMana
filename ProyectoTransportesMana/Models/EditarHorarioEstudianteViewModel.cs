namespace ProyectoTransportesMana.Models
{
    public class EditarHorarioEstudianteViewModel
    {
        public int IdEstudiante { get; set; }
        public string NombreEstudiante { get; set; } = string.Empty;
        public string Institucion { get; set; } = string.Empty;

        public List<HorarioDiaViewModel> Horario { get; set; } = new();
    }
}
