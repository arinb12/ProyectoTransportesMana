namespace ProyectoTransportesMana.Models
{
    public class PortalPadresViewModel
    {
        public PersonaSimpleModel? Conductor { get; set; }
        public PersonaSimpleModel? Ayudante { get; set; }
        public List<HijoHorarioViewModel> Hijos { get; set; } = new();
    }

    public class PersonaSimpleModel
    {
        public int Id { get; set; }
        public string NombreCompleto { get; set; } = string.Empty;
        public string? Telefono { get; set; }
    }

    public class HijoHorarioViewModel
    {
        public int IdEstudiante { get; set; }
        public string NombreEstudiante { get; set; } = string.Empty;
        public string Institucion { get; set; } = string.Empty;
        public List<CambioHorarioViewModel> CambiosHorario { get; set; } = new();
        public List<HorarioDiaViewModel> HorarioAnual { get; set; } = new();
    }

    public class CambioHorarioViewModel
    {
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = string.Empty;       // Entrada, Salida, Ambos
        public string HoraRegular { get; set; } = string.Empty;
        public string HoraAjustada { get; set; } = string.Empty;
        public string Motivo { get; set; } = string.Empty;
    }
}
