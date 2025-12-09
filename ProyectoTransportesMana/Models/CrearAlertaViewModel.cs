using Microsoft.AspNetCore.Mvc.Rendering;

namespace ProyectoTransportesMana.Models
{
    public class CrearAlertaViewModel
    {
        public int EnviadoPor { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string TipoAlerta { get; set; } = string.Empty;
        public string Mensaje { get; set; } = string.Empty;
        public string PublicoDestino { get; set; } = string.Empty;
        public DateTime? FechaPublicacion { get; set; }

        // <-- añadir estas dos
        public IEnumerable<SelectListItem>? BusetasSelectList { get; set; }
        public IEnumerable<SelectListItem>? EncargadosSelectList { get; set; }

    }
}
