namespace ProyectoTransportesManaAPI.Models
{
    public record AsistenteListItemResponse(
        int Id,
        string Nombre,
        string PrimerApellido,
        string? SegundoApellido,  
        string Telefono,
        string Cedula,
        string? Correo,           
        decimal Salario,
        string? BusetaTexto,      
        DateTime? FechaInicio,    
        bool Activo,
        bool Eliminado
    );
}
