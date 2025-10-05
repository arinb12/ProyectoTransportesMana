namespace ProyectoTransportesMana.Contracts.Estudiantes;

using System.ComponentModel.DataAnnotations;

public sealed record class EstudianteCreateRequest
{
    [Required, MinLength(1)] public string Nombre { get; init; } = default!;
    [Required, MinLength(1)] public string PrimerApellido { get; init; } = default!;
    public string? SegundoApellido { get; init; }
    [Required] public bool Activo { get; init; }
    [Range(1, int.MaxValue)] public int IdEncargado { get; init; }
    [Range(1, int.MaxValue)] public int IdInstitucion { get; init; }
    public string? Seccion { get; init; }
    [Range(1, int.MaxValue)] public int IdMaestra { get; init; }
}

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