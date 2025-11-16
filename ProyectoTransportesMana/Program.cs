using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// MVC
builder.Services.AddControllersWithViews();

// HttpClient hacia API
builder.Services.AddHttpClient("Api", (sp, client) =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var baseUrl = cfg["Api:BaseUrl"];
    if (string.IsNullOrWhiteSpace(baseUrl))
        throw new InvalidOperationException("Falta Api:BaseUrl en appsettings.json");

    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.DefaultRequestHeaders.Accept.Add(
        new MediaTypeWithQualityHeaderValue("application/json"));
});

builder.Services.AddSession();

var app = builder.Build();

// Global error handler
app.UseExceptionHandler("/Error/MostrarError");
app.UseHsts();

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseSession();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
