using Microsoft.AspNetCore.Mvc;
using ProyectoTransportesMana.Models;
using System.Collections.Generic;
using System.Linq;

namespace ProyectoTransportesMana.Controllers
{
    public class BusetasController : Controller
    {
        // 🔹 Simulación de datos en memoria (reemplaza por tu DBContext más adelante)
        private static List<Buseta> _busetas = new List<Buseta>
        {
            new Buseta { Id = 1, Nombre = "Buseta 1", Placa = "ABC123" },
            new Buseta { Id = 2, Nombre = "Buseta 2", Placa = "XYZ789" }
        };

        // GET: /Busetas
        public IActionResult Index()
        {
            return View(_busetas);
        }

        // GET: /Busetas/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: /Busetas/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(Buseta buseta)
        {
            if (ModelState.IsValid)
            {
                buseta.Id = _busetas.Any() ? _busetas.Max(b => b.Id) + 1 : 1;
                _busetas.Add(buseta);
                return RedirectToAction(nameof(Index));
            }
            return View(buseta);
        }

        // GET: /Busetas/Edit/5
        public IActionResult Edit(int id)
        {
            var buseta = _busetas.FirstOrDefault(b => b.Id == id);
            if (buseta == null)
                return NotFound();

            return View(buseta);
        }

        // POST: /Busetas/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(int id, Buseta buseta)
        {
            if (id != buseta.Id)
                return NotFound();

            if (ModelState.IsValid)
            {
                var existente = _busetas.FirstOrDefault(b => b.Id == id);
                if (existente == null) return NotFound();

                existente.Nombre = buseta.Nombre;
                existente.Placa = buseta.Placa;

                return RedirectToAction(nameof(Index));
            }
            return View(buseta);
        }

        // GET: /Busetas/Delete/5
        public IActionResult Delete(int id)
        {
            var buseta = _busetas.FirstOrDefault(b => b.Id == id);
            if (buseta == null)
                return NotFound();

            return View(buseta);
        }

        // POST: /Busetas/DeleteConfirmed/5
        [HttpPost, ActionName("DeleteConfirmed")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(int id)
        {
            var buseta = _busetas.FirstOrDefault(b => b.Id == id);
            if (buseta != null)
                _busetas.Remove(buseta);

            return RedirectToAction(nameof(Index));
        }
    }
}
