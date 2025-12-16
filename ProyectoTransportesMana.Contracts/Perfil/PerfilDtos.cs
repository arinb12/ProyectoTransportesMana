namespace ProyectoTransportesMana.Contracts.Perfil
{
    public class PerfilResponse
    {
        public int IdUsuario { get; set; }
        public int RolId { get; set; }
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public string? Telefono { get; set; }
        public string? FotoPerfil { get; set; }
    }
    public class PerfilUpdateRequest
    {
        public int IdUsuario { get; set; }
        public string? Correo { get; set; }
        public string? Telefono { get; set; }
        public string? FotoPerfil { get; set; } 
    }
}
