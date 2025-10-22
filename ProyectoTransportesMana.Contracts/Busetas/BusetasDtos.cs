namespace ProyectoTransportesMana.Contracts.Busetas
{
    public record BusetaListItemResponse(
        int Id,
        string Placa,
        int Capacidad,
        string NombreConductor,
        string Jornada,
        string HorarioServicio,
        bool Activa,
        string CedulaConductor
    );

    public record BusetaResponse(
        int Id,
        string Placa,
        int Capacidad,
        string NombreConductor,
        string Jornada,
        string HorarioServicio,
        bool Activa,
        string CedulaConductor
    );

    public record BusetaCreateRequest(
        string Placa,
        int Capacidad,
        string NombreConductor,
        string Jornada,
        string HorarioServicio,
        bool Activa,
        string CedulaConductor
    );

    public record BusetaUpdateRequest(
        int Id,
        string Placa,
        int Capacidad,
        string NombreConductor,
        string Jornada,
        string HorarioServicio,
        bool Activa,
        string CedulaConductor
    );

    public record AsignacionEstudianteBusetaResponse(
        int IdAsignacion,
        int IdEstudiante,
        int IdBuseta,
        DateTime FechaAsignacion,
        bool Activa
    );

    public record AsignacionEstudianteBusetaCreateRequest(
        int IdEstudiante,
        int IdBuseta
    );

    public record BusetaConAsignacionesResponse(
        BusetaResponse Buseta,
        int TotalAsignaciones,
        List<int> EstudiantesAsignados
    );
}
