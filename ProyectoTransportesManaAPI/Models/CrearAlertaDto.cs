namespace ProyectoTransportesManaAPI.Models
{
    public class CrearAlertaDto
    {
        public int EnviadoPor { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string TipoAlerta { get; set; } = string.Empty;
        public string Mensaje { get; set; } = string.Empty;
        public string PublicoDestino { get; set; } = string.Empty; // 'todos' | 'usuario:123' | 'ruta:1' | 'buseta:A'
        public DateTime? FechaPublicacion { get; set; }
    }
}
