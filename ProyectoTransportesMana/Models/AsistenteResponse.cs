namespace ProyectoTransportesMana.Models
{
    public class AsistenteResponse
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public bool Activo { get; set; }
        public int BusetaId { get; set; }
        public string Telefono { get; set; } = "";
        public string Cedula { get; set; } = "";
        public string? Correo { get; set; }
        public int Salario { get; set; }
    }
}
