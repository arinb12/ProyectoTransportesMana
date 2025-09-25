using ProyectoTransportesMana.Models;
using System.ComponentModel.DataAnnotations;
using ProyectoTransportesMana.Controllers;

using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Models
{
    public class Buseta
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "El nombre es obligatorio")]
        [Display(Name = "Nombre de la Buseta")]
        public string Nombre { get; set; }

        [Required(ErrorMessage = "La placa es obligatoria")]
        [Display(Name = "Placa")]
        public string Placa { get; set; }
    }
}
