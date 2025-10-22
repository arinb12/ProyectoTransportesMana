namespace ProyectoTransportesManaAPI.Models
{
    public class AsistenteListadoDto
    {
        public int Id { get; set; }                 // a.id_asistente
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string SegundoApellido { get; set; } = "";
        public string Telefono { get; set; } = "";
        public string Cedula { get; set; } = "";
        public string? Correo { get; set; }
        public int Salario { get; set; }
        public string? BusetaTexto { get; set; }    // p.ej. "Buseta - ABC123"
        public DateTime? FechaInicio { get; set; }  // si no existe en tu tabla, devolver NULL
        public bool Activo { get; set; }
    }
}
