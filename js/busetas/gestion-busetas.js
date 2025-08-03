  initDataTable('tablaBusetas', [6]);

    const btnAdd = document.getElementById('btnNuevaBuseta');
  const modal = new bootstrap.Modal(document.getElementById('modalBuseta'));
  const form = document.getElementById('busetaForm');
  const alerta = document.getElementById('alertaEliminado');
  let busetas = JSON.parse(localStorage.getItem('busetas') || '[]');

  function actualizarTabla() {
    const tbody = document.querySelector('#tablaBusetas tbody');
    tbody.innerHTML = '';
    busetas.forEach((b,i) => {
      tbody.innerHTML += `
        <tr>
          <td>${b.placa}</td><td>${b.conductor}</td><td>${b.capacidad}</td><td>${b.jornada}</td><td>${b.horario}</td><td>${b.estudiantes}</td>
          <td>
            <a href="#" class="text-primary ms-2" title="Editar" onclick="editarBuseta(${i})">
              <i class="fas fa-edit"></i>
            </a>
            <a href="#" class="text-danger ms-2" title="Eliminar" onclick="eliminarBuseta(${i})">
              <i class="fas fa-trash-alt"></i>
            </a>
            
          </td>
        </tr>`;
    });
  }

  window.editarBuseta = index => {
    const b = busetas[index];
    ['placa','conductor','capacidad','jornada','horario','estudiantes']
      .forEach(id => document.getElementById(id).value = b[id]);
    form.editIndex.value = index;
    modal.show();
  };

  window.eliminarBuseta = index => {
    if (!confirm('¿Eliminar buseta?')) return;
    busetas.splice(index, 1);
    localStorage.setItem('busetas', JSON.stringify(busetas));
    actualizarTabla();
    alerta.classList.remove('d-none');
    setTimeout(() => alerta.classList.add('d-none'), 2000);
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add('was-validated'); return;
    }
    const data = {
      placa: form.placa.value.trim(),
      conductor: form.conductor.value.trim(),
      capacidad: form.capacidad.value.trim(),
      jornada: form.jornada.value.trim(),
      horario: form.horario.value.trim(),
      estudiantes: form.estudiantes.value.trim()
    };
    const idx = form.editIndex.value;
    if (idx !== '') busetas[idx] = data; else busetas.push(data);
    localStorage.setItem('busetas', JSON.stringify(busetas));
    actualizarTabla();
    modal.hide();
  });

  actualizarTabla();