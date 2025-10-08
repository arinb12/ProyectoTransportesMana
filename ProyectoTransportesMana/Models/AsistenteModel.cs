using Microsoft.AspNetCore.Mvc.Rendering;

namespace ProyectoTransportesMana.Models
{
    public class AsistenteModel
    {
        public int? Id { get; set; }                 // <- para edición/hidden
        public string Nombre { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string Cedula { get; set; } = string.Empty;
        public string? Correo { get; set; }
        public decimal Salario { get; set; }         // <- número
        public int? BusetaId { get; set; }           // <- FK
        public bool Activo { get; set; } = true;     // <- checkbox

        public IEnumerable<SelectListItem> BusetasSelectList { get; set; }
            = Enumerable.Empty<SelectListItem>();
    }
}
