using ProyectoTransportesMana.Contracts.Usuarios;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace ProyectoTransportesMana.Models.Usuarios
{
    public class UsuariosGestionViewModel
    {
        public List<UsuarioListItemResponse> Usuarios { get; set; } = new();
        public UsuarioCreateRequest Nuevo { get; set; } = new();
        public UsuarioUpdateRequest Editar { get; set; } = new();

        public List<SelectListItem> Roles { get; set; } = new();
    }
}
