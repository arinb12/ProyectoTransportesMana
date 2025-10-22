namespace ProyectoTransportesManaAPI.Models
{
    public class AsistenteUpdateRequest
    {
        public int Id { get; set; }                 // id_usuario / id_asistente
        public string Nombre { get; set; } = string.Empty;
        public string PrimerApellido { get; set; } = string.Empty;
        public string? SegundoApellido { get; set; }
        public bool Activo { get; set; } = true;
        public string Telefono { get; set; } = string.Empty;
        public string Cedula { get; set; } = string.Empty;
        public string? Correo { get; set; }
        public int Salario { get; set; }        
        public int BusetaId { get; set; }
    }
}
