namespace ProyectoTransportesMana.Contracts.Estudiantes;

using System.ComponentModel.DataAnnotations;

public sealed record EstudianteCreateRequest(
    [property: Required, MinLength(1)] string Nombre,
    [property: Required, MinLength(1)] string PrimerApellido,
    string? SegundoApellido,
    [property: Required] bool Activo,
    [property: Range(1, int.MaxValue)] int IdEncargado,
    [property: Range(1, int.MaxValue)] int IdInstitucion,
    string? Seccion,
    [property: Range(1, int.MaxValue)] int IdMaestra
);

public sealed record EstudianteResponse(
    int Id,
    string Nombre,
    string PrimerApellido,
    string? SegundoApellido,
    bool Activo,
    int IdEncargado,
    int IdInstitucion,
    string? Seccion,
    int IdMaestra
);

public sealed record EstudianteListItemResponse(
    int Id,
    string NombreCompletoEstudiante,
    string? Seccion,
    string Institucion,
    string Maestra,
    string Encargado,
    bool Activo
);