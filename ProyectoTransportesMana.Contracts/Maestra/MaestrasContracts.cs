using System;
namespace ProyectoTransportesMana.Contracts.Maestras;

using System.ComponentModel.DataAnnotations;

//
// ================================
//  CREATE REQUEST
// ================================
//
public sealed record class MaestraCreateRequest
{
    [Display(Name = "Nombre completo")]
    [Required(ErrorMessage = "El campo {0} es obligatorio.")]
    public string Nombre { get; init; } = default!;

    [Display(Name = "Institución")]
    [Range(1, int.MaxValue, ErrorMessage = "Debe seleccionar una {0}.")]
    public int IdInstitucion { get; init; }

    [Display(Name = "Sección")]
    [Required(ErrorMessage = "La {0} es obligatoria.")]
    public string Seccion { get; init; } = default!;

    [Display(Name = "Activo")]
    public bool Activo { get; init; }
}

//
// ================================
//  UPDATE REQUEST
// ================================
//
public sealed record class MaestraUpdateRequest
{
    [Required]
    public int IdMaestra { get; init; }

    [Required(ErrorMessage = "El campo {0} es obligatorio.")]
    public string Nombre { get; init; } = default!;

    [Range(1, int.MaxValue)]
    public int IdInstitucion { get; init; }

    [Required]
    public string Seccion { get; init; } = default!;

    public bool Activo { get; init; }
}

//
// ================================
//  RESPONSE (GET BY ID)
// ================================
//
public sealed record MaestraResponse(
    int IdMaestra,
    string Nombre,
    int IdInstitucion,
    string Seccion,
    bool Activo
);

//
// ================================
//  LIST ITEM RESPONSE (Tabla)
// ================================
//
public sealed record MaestraListItemResponse(
    int IdMaestra,
    string Nombre,
    string Institucion,
    string Seccion,
    bool Activo
);
