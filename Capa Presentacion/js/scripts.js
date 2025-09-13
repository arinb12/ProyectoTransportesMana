document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('sidebarToggle');
  const wrapper = document.getElementById('wrapper');

  toggleBtn.addEventListener('click', () => {
    wrapper.classList.toggle('toggled');
  });
});
