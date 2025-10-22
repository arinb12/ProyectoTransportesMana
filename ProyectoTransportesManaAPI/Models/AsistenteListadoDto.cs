namespace ProyectoTransportesManaAPI.Models
{
    public class AsistenteListadoDto
    {
        public int Id { get; set; }                 
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string SegundoApellido { get; set; } = "";
        public string Telefono { get; set; } = "";
        public string Cedula { get; set; } = "";
        public string? Correo { get; set; }
        public int Salario { get; set; }
        public string? BusetaTexto { get; set; }    
        public DateTime? FechaInicio { get; set; } 
        public bool Activo { get; set; }
    }
}
