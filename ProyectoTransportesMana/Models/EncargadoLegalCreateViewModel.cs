namespace ProyectoTransportesMana.Models
{
    public class EncargadoLegalCreateViewModel
    {
        public UsuarioModel Usuario { get; set; } = new UsuarioModel();
        public EncargadoLegalModel Encargado { get; set; } = new EncargadoLegalModel();
    }
}
