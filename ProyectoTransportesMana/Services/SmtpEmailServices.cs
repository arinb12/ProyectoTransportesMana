using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;
using NETCore.MailKit.Core;
using NETCore.MailKit.Infrastructure.Internal;
using ProyectoTransportesMana.Config;

namespace ProyectoTransportesMana.Services
{
    public class SmtpEmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public SmtpEmailService(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task EnviarEmailAsync(string destinatario, string asunto, string cuerpoHtml)
        {
            using var client = new SmtpClient(_settings.SmtpServer, _settings.SmtpPort)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(_settings.UserName, _settings.Password)
            };

            var from = new MailAddress(_settings.FromEmail, _settings.FromName);
            var to = new MailAddress(destinatario);

            using var message = new MailMessage(from, to)
            {
                Subject = asunto,
                Body = cuerpoHtml,
                IsBodyHtml = true
            };

            await client.SendMailAsync(message);
        }

        public void Send(string mailTo, string subject, string message, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string subject, string message, string[] attachments, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string subject, string message, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string subject, string message, string[] attachments, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string mailCc, string mailBcc, string subject, string message, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string mailCc, string mailBcc, string subject, string message, string[] attachments, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string mailCc, string mailBcc, string subject, string message, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public void Send(string mailTo, string mailCc, string mailBcc, string subject, string message, Encoding encoding, string[] attachments, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string subject, string message, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string subject, string message, string[] attachments, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string subject, string message, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string subject, string message, string[] attachments, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string mailCc, string mailBcc, string subject, string message, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string mailCc, string mailBcc, string subject, string message, string[] attachments, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string mailCc, string mailBcc, string subject, string message, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }

        public Task SendAsync(string mailTo, string mailCc, string mailBcc, string subject, string message, string[] attachments, Encoding encoding, bool isHtml = false, SenderInfo sender = null)
        {
            throw new NotImplementedException();
        }
    }
}
