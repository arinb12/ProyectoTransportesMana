using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace ProyectoTransportesMana.Models
{
    public class AsistenteModel
    {
        public int? Id { get; set; }

        [Required, MinLength(3)]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        public string PrimerApellido { get; set; } = string.Empty;

        public string SegundoApellido { get; set; } = string.Empty;

        [Required, RegularExpression(@"^\d{8}$", ErrorMessage = "Teléfono debe tener 8 dígitos.")]
        public string Telefono { get; set; } = string.Empty;

        [Required, RegularExpression(@"^\d{9}$", ErrorMessage = "Cédula debe tener 9 dígitos.")]
        public string Cedula { get; set; } = string.Empty;

        [EmailAddress]
        public string? Correo { get; set; }

        [Range(0, 999999999)]
        public int Salario { get; set; }

        [Required(ErrorMessage = "Seleccione una buseta.")]
        public int? BusetaId { get; set; }

        public bool Activo { get; set; } = true;

        public IEnumerable<SelectListItem> BusetasSelectList { get; set; } = Enumerable.Empty<SelectListItem>();
    }
}
