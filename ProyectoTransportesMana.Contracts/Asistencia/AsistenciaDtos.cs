namespace ProyectoTransportesMana.Contracts.Asistencia
{
    public sealed record AsistenciaEstudianteListItemResponse(
        int IdEstudiante,
        string Nombre,
        string Apellidos,
        string? Seccion
    );
    public sealed record AsistenciaDetalleItemRequest
   (
       int IdEstudiante,
       string Estado,
       string? Observaciones
   );

    public sealed record GuardarAsistenciaRequest
    (
        int IdInstitucion,
        int IdBuseta,
        string TipoViaje,
        int IdUsuarioRegistro,
        List<AsistenciaDetalleItemRequest> Detalles
    );

    public sealed record AsistenciaEstadoResponse
    (
       int IdEstudiante,
       string Estado
    );

    public sealed record AsistenciaHistorialRowResponse(
       DateTime Fecha,
       int IdInstitucion,
       string Escuela,
       int IdBuseta,
       string PlacaBuseta,
       string NombreConductor,
       string TipoViaje,
       int IdEstudiante,
       string Nombre,
       string Apellidos,
       string? Seccion,
       string Estado,
       string? Observaciones
   );


}