using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ProyectoTransportesMana.Contracts.Horarios
{
    public class HorarioListItemResponse
    {
        public int IdHorario { get; set; }
        public int IdEstudiante { get; set; }
        public string DiaSemana { get; set; } = "";
        public TimeSpan HoraEntrada { get; set; }
        public TimeSpan HoraSalida { get; set; }
    }
}
