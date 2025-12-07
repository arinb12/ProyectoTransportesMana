namespace ProyectoTransportesMana.Services
{
    public interface IEmailService
    {
        Task EnviarEmailAsync(string destinatario, string asunto, string cuerpoHtml);
    }
}
