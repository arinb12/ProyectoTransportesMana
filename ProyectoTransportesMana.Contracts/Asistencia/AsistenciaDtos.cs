namespace ProyectoTransportesMana.Contracts.Asistencia
{
    public sealed record AsistenciaEstudianteListItemResponse(
        int IdEstudiante,
        string Nombre,
        string Apellidos,
        string? Seccion
    );
}