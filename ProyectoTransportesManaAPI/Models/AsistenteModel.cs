namespace ProyectoTransportesManaAPI.Models
{
    public class AsistenteModel
    {
        public int? Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string PrimerApellido { get; set; } = string.Empty;
        public string SegundoApellido { get; set; } = string.Empty;
        public string Telefono { get; set; } = string.Empty;
        public string Cedula { get; set; } = string.Empty;
        public string? Correo { get; set; }
        public int Salario { get; set; }   // usa decimal si en BD lo dejas INT igual funciona
        public int? BusetaId { get; set; }
        public bool Activo { get; set; } = true;
    }
}
