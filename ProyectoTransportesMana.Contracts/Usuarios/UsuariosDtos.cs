using System.ComponentModel.DataAnnotations;

namespace ProyectoTransportesMana.Contracts.Usuarios
{
    public class UsuarioListItemResponse
    {
        public int IdUsuario { get; set; }
        public int RolId { get; set; }
        public string RolNombre { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string PrimerApellido { get; set; } = string.Empty;
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public DateTime FechaRegistro { get; set; }
        public bool Activo { get; set; }
        public bool Eliminado { get; set; }
    }

    public class UsuarioResponse : UsuarioListItemResponse { }

    public class UsuarioCreateRequest
    {
        [Range(1, int.MaxValue)]
        public int RolId { get; set; }

        [Required, StringLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string PrimerApellido { get; set; } = string.Empty;

        [StringLength(100)]
        public string? SegundoApellido { get; set; }

        [EmailAddress, StringLength(250)]
        public string? Correo { get; set; }

        [Required, StringLength(200)]
        public string Contrasena { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;
    }

    public class UsuarioUpdateRequest
    {
        [Range(1, int.MaxValue)]
        public int IdUsuario { get; set; }

        [Range(1, int.MaxValue)]
        public int RolId { get; set; }

        [Required, StringLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string PrimerApellido { get; set; } = string.Empty;

        [StringLength(100)]
        public string? SegundoApellido { get; set; }

        [EmailAddress, StringLength(250)]
        public string? Correo { get; set; }

        public bool Activo { get; set; }

        // opcional: si viene null o vacío, tu SP no cambia el hash
        public string? Contrasena { get; set; }
    }
}
