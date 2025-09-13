
initDataTable('tablaAlertas', [5]);

const publico = document.getElementById("publico");

const selects = {
   ruta: document.getElementById("grupoRuta"),
   buseta: document.getElementById("grupoBuseta"),
   encargado: document.getElementById("grupoEncargado")
};

publico.addEventListener("change", () => {
   const value = publico.value;

   // Oculta todos los grupos
   Object.values(selects).forEach(group => group.classList.add("d-none"));

   // Muestra el grupo relacionado si aplica
   if (selects[value]) {
      selects[value].classList.remove("d-none");
   }
});
