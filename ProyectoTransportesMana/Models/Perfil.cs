namespace ProyectoTransportesMana.Models.Perfil
{
    public class PerfilVm
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public string? Telefono { get; set; }
        public string? FotoPerfil { get; set; }
    }

    public class PerfilUpdateRequestMvc
    {
        public int IdUsuario { get; set; }
        public string? Correo { get; set; }
        public string? Telefono { get; set; }
        public string? FotoPerfil { get; set; }
    }
}
