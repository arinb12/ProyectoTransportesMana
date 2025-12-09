using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Contracts.Busetas;
using ProyectoTransportesMana.Models;
using ProyectoTransportesMana.Models.Filters;
using System.Net;
using System.Net.Http.Json;

namespace ProyectoTransportesMana.Controllers
{
    [Seguridad]
    public class BusetasController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public BusetasController(IHttpClientFactory httpClientFactory)
            => _httpClientFactory = httpClientFactory;

        // GET: /Busetas
        public async Task<IActionResult> Index()
        {
            var client = _httpClientFactory.CreateClient("Api");
            var busetas = await GetOrEmpty<List<BusetaListItemResponse>>(client, "api/v1/busetas") ?? new();

            // Convertir DTOs a modelos para la vista
            var modelos = busetas.Select(b => new Buseta
            {
                Id = b.Id,
                Placa = b.Placa,
                Capacidad = b.Capacidad,
                NombreConductor = b.NombreConductor,
                Jornada = b.Jornada,
                HorarioServicio = b.HorarioServicio,
                Activa = b.Activa,
                CedulaConductor = b.CedulaConductor
            }).ToList();

            return View(modelos);
        }

        // GET: /Busetas/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: /Busetas/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(Buseta buseta)
        {
            if (ModelState.IsValid)
            {
                var client = _httpClientFactory.CreateClient("Api");
                var payload = new BusetaCreateRequest(
                    buseta.Placa!,
                    buseta.Capacidad,
                    buseta.NombreConductor!,
                    buseta.Jornada!,
                    buseta.HorarioServicio!,
                    buseta.Activa,
                    buseta.CedulaConductor!
                );

                var resp = await client.PostAsJsonAsync("api/v1/busetas", payload);

                if (resp.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "Buseta registrada exitosamente.";
                    return RedirectToAction(nameof(Index));
                }

                var problem = await SafeReadProblemDetails(resp);
                ModelState.AddModelError(string.Empty,
                    problem?.Detail ?? problem?.Title ?? "No se pudo registrar la buseta.");
            }
            return View(buseta);
        }

        // GET: /Busetas/Edit/5
        public async Task<IActionResult> Edit(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var resp = await client.GetAsync($"api/v1/busetas/{id}");

            if (!resp.IsSuccessStatusCode)
            {
                if (resp.StatusCode == HttpStatusCode.NotFound)
                    return NotFound();
                return StatusCode((int)resp.StatusCode);
            }

            var dto = await resp.Content.ReadFromJsonAsync<BusetaResponse>();
            if (dto is null) return NotFound();

            var buseta = new Buseta
            {
                Id = dto.Id,
                Placa = dto.Placa,
                Capacidad = dto.Capacidad,
                NombreConductor = dto.NombreConductor,
                Jornada = dto.Jornada,
                HorarioServicio = dto.HorarioServicio,
                Activa = dto.Activa,
                CedulaConductor = dto.CedulaConductor
            };

            return View(buseta);
        }

        // POST: /Busetas/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, Buseta buseta)
        {
            if (id != buseta.Id)
                return NotFound();

            if (ModelState.IsValid)
            {
                var client = _httpClientFactory.CreateClient("Api");
                var payload = new BusetaUpdateRequest(
                    buseta.Id,
                    buseta.Placa!,
                    buseta.Capacidad,
                    buseta.NombreConductor!,
                    buseta.Jornada!,
                    buseta.HorarioServicio!,
                    buseta.Activa,
                    buseta.CedulaConductor!
                );

                var resp = await client.PutAsJsonAsync($"api/v1/busetas/{id}", payload);

                if (resp.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "Buseta actualizada exitosamente.";
                    return RedirectToAction(nameof(Index));
                }

                var problem = await SafeReadProblemDetails(resp);
                ModelState.AddModelError(string.Empty,
                    problem?.Detail ?? problem?.Title ?? "No se pudo actualizar la buseta.");
            }
            return View(buseta);
        }

        // GET: /Busetas/Delete/5
        public async Task<IActionResult> Delete(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var resp = await client.GetAsync($"api/v1/busetas/{id}");

            if (!resp.IsSuccessStatusCode)
            {
                if (resp.StatusCode == HttpStatusCode.NotFound)
                    return NotFound();
                return StatusCode((int)resp.StatusCode);
            }

            var dto = await resp.Content.ReadFromJsonAsync<BusetaResponse>();
            if (dto is null) return NotFound();

            var buseta = new Buseta
            {
                Id = dto.Id,
                Placa = dto.Placa,
                Capacidad = dto.Capacidad,
                NombreConductor = dto.NombreConductor,
                Jornada = dto.Jornada,
                HorarioServicio = dto.HorarioServicio,
                Activa = dto.Activa,
                CedulaConductor = dto.CedulaConductor
            };

            return View(buseta);
        }

        // POST: /Busetas/DeleteConfirmed/5
        [HttpPost, ActionName("DeleteConfirmed")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");
            var resp = await client.DeleteAsync($"api/v1/busetas/{id}");

            if (resp.IsSuccessStatusCode)
            {
                TempData["SuccessMessage"] = "Buseta eliminada exitosamente.";
            }
            else
            {
                TempData["ErrorMessage"] = "No se pudo eliminar la buseta.";
            }

            return RedirectToAction(nameof(Index));
        }

        // GET: /Busetas/Asignaciones/5
        public async Task<IActionResult> Asignaciones(int id)
        {
            var client = _httpClientFactory.CreateClient("Api");

            // Obtener información de la buseta
            var busetaResp = await client.GetAsync($"api/v1/busetas/{id}");
            if (!busetaResp.IsSuccessStatusCode)
            {
                if (busetaResp.StatusCode == HttpStatusCode.NotFound)
                    return NotFound();
                return StatusCode((int)busetaResp.StatusCode);
            }

            var busetaDto = await busetaResp.Content.ReadFromJsonAsync<BusetaResponse>();
            if (busetaDto is null) return NotFound();

            var buseta = new Buseta
            {
                Id = busetaDto.Id,
                Placa = busetaDto.Placa,
                Capacidad = busetaDto.Capacidad,
                NombreConductor = busetaDto.NombreConductor,
                Jornada = busetaDto.Jornada,
                HorarioServicio = busetaDto.HorarioServicio,
                Activa = busetaDto.Activa,
                CedulaConductor = busetaDto.CedulaConductor
            };

            // Obtener asignaciones
            var asignacionesResp = await client.GetAsync($"api/v1/busetas/{id}/asignaciones");
            var asignaciones = await GetOrEmpty<List<AsignacionEstudianteBusetaResponse>>(client, $"api/v1/busetas/{id}/asignaciones") ?? new();

            ViewBag.Buseta = buseta;
            ViewBag.Asignaciones = asignaciones;

            return View();
        }

        // GET: /Busetas/Activas
        public async Task<IActionResult> Activas()
        {
            var client = _httpClientFactory.CreateClient("Api");
            var busetas = await GetOrEmpty<List<BusetaListItemResponse>>(client, "api/v1/busetas/activas") ?? new();

            var modelos = busetas.Select(b => new Buseta
            {
                Id = b.Id,
                Placa = b.Placa,
                Capacidad = b.Capacidad,
                NombreConductor = b.NombreConductor,
                Jornada = b.Jornada,
                HorarioServicio = b.HorarioServicio,
                Activa = b.Activa,
                CedulaConductor = b.CedulaConductor
            }).ToList();

            return View("Index", modelos);
        }

        // GET: /Busetas/DetalleAsignaciones
        public async Task<IActionResult> DetalleAsignaciones()
        {
            var client = _httpClientFactory.CreateClient("Api");
            var busetasConAsignaciones = await GetOrEmpty<List<BusetaConAsignacionesResponse>>(client, "api/v1/busetas/con-asignaciones") ?? new();

            ViewBag.BusetasConAsignaciones = busetasConAsignaciones;
            return View();
        }

        private static async Task<T?> GetOrEmpty<T>(HttpClient client, string url)
        {
            try
            {
                var resp = await client.GetAsync(url);
                if (!resp.IsSuccessStatusCode) return default;
                return await resp.Content.ReadFromJsonAsync<T>();
            }
            catch
            {
                return default;
            }
        }

        private static async Task<ProblemDetails?> SafeReadProblemDetails(HttpResponseMessage resp)
        {
            try
            {
                return await resp.Content.ReadFromJsonAsync<ProblemDetails>();
            }
            catch { return null; }
        }
    }
}
