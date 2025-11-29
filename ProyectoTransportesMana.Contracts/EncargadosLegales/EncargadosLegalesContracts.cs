using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProyectoTransportesMana.Contracts.EncargadosLegales
{
    public sealed class EncargadoLegalListItemResponse
    {
        public int IdUsuario { get; set; }              // mismo que id_encargado
        public string NombreCompleto { get; set; } = "";
        public string? Telefono { get; set; }
        public bool Activo { get; set; }
    }

    // Para ver el detalle de un encargado (para editar)
    public sealed class EncargadoLegalResponse
    {
        public int IdUsuario { get; set; }              // PK/encargado

        // Datos de usuario
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public bool Activo { get; set; }

        // Datos de encargado_legales
        public string? DireccionResidencia { get; set; }
        public bool? AceptoTerminos { get; set; }
        public DateTime? FirmaContrato { get; set; }
        public string? Telefono { get; set; }
    }

    // crear un nuevo encargado (registro desde formulario)
    public sealed class EncargadoLegalCreateRequest
    {
        // Usuario
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public string Contrasena { get; set; } = "";   
        public bool Activo { get; set; } = true;

        // Encargado
        public string? DireccionResidencia { get; set; }
        public bool? AceptoTerminos { get; set; }
        public DateTime? FirmaContrato { get; set; }
        public string? Telefono { get; set; }
    }

    // actualizar un encargado existente
    public sealed class EncargadoLegalUpdateRequest
    {
        public int IdUsuario { get; set; }             // id del encargado

        // Usuario
        public string Nombre { get; set; } = "";
        public string PrimerApellido { get; set; } = "";
        public string? SegundoApellido { get; set; }
        public string? Correo { get; set; }
        public bool Activo { get; set; }

        // Encargado
        public string? DireccionResidencia { get; set; }
        public bool? AceptoTerminos { get; set; }
        public DateTime? FirmaContrato { get; set; }
        public string? Telefono { get; set; }
    }

    //Para cambiar solo el estado (activar/desactivar)
    public sealed class EncargadoLegalEstadoUpdateRequest
    {
        public bool Activo { get; set; }
    }
}
