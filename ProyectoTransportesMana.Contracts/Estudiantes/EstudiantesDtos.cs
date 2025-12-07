namespace ProyectoTransportesMana.Contracts.Estudiantes;

using System.ComponentModel.DataAnnotations;

public sealed record class EstudianteCreateRequest
{
    [Display(Name = "Nombre")]
    [Required(ErrorMessage = "El campo {0} es obligatorio."), MinLength(1)]
    public string Nombre { get; init; } = default!;

    [Display(Name = "Primer apellido")]
    [Required(ErrorMessage = "El campo {0} es obligatorio."), MinLength(1)]
    public string PrimerApellido { get; init; } = default!;

    public string? SegundoApellido { get; init; }
    public bool Activo { get; init; }

    [Display(Name = "Encargado legal")]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar un {0}.")]
    public int IdEncargado { get; init; }

    [Display(Name = "Institución")]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar una {0}.")]
    public int IdInstitucion { get; init; }

    [Display(Name = "Sección")]
    [Required(ErrorMessage = "La {0} es obligatoria.")]
    public string? Seccion { get; init; }

    [Display(Name = "Maestra")]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar una {0}.")]
    public int IdMaestra { get; init; }

    [Display(Name = "Teléfono")]
    [RegularExpression(@"^(\+506[\s]?)?\d{4}-\d{4}$",
        ErrorMessage = "Formato de teléfono inválido. Use ####-#### o +506 ####-####.")]
    [Required(ErrorMessage = "El campo {0} es obligatorio.")]
    public string Telefono { get; init; } = default!;

    public List<int>? Busetas { get; set; }
}


public sealed record class EstudianteUpdateRequest
{
    [Required] public int Id { get; init; }
    [Required, MinLength(1)] public string Nombre { get; init; } = default!;
    [Required, MinLength(1)] public string PrimerApellido { get; init; } = default!;
    public string? SegundoApellido { get; init; }
    public bool Activo { get; init; }

    [Range(1, int.MaxValue)] public int IdEncargado { get; init; }
    [Range(1, int.MaxValue)] public int IdInstitucion { get; init; }
    [Required] public string Seccion { get; init; } = default!;
    [Range(1, int.MaxValue)] public int IdMaestra { get; init; }

    [Required]
    [RegularExpression(@"^(\+506[\s]?)?\d{4}-\d{4}$",
        ErrorMessage = "Formato de teléfono inválido. Use ####-#### o +506 ####-####.")]
    public string Telefono { get; init; } = default!;
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
    int IdMaestra,
    string Telefono
);

public sealed record EstudianteListItemResponse(
    int Id,
    string NombreCompletoEstudiante,
    string? Seccion,
    string Institucion,
    string Maestra,
    string Encargado,
    bool Activo,
    string Telefono
);

public class EstudianteTransporteDetalleResponse
{
    public int IdEstudiante { get; set; }
    public int? IdBuseta { get; set; }
    public string? PlacaBuseta { get; set; }

    public string? ConductorNombre { get; set; }
    public string? ConductorCedula { get; set; }

    public string? Jornada { get; set; }
    public string? HorarioServicio { get; set; }
    public int? Capacidad { get; set; }
    public bool? BusetaActiva { get; set; }

    public int? IdAsistente { get; set; }
    public string? AsistenteCedula { get; set; }
    public string? AsistenteTelefono { get; set; }
    public string? AsistenteNombre { get; set; }
};