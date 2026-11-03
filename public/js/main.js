/* === COUNTDOWN === */
function updateCountdown() {
  const target = new Date('2026-06-07T06:13:00-07:00');
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) {
    document.getElementById('countdown').innerHTML =
      '<p class="countdown-over">Today is the day!</p>';
    return;
  }

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  document.getElementById('cd-days').textContent    = pad(diff / 86400000);
  document.getElementById('cd-hours').textContent   = pad((diff % 86400000) / 3600000);
  document.getElementById('cd-minutes').textContent = pad((diff % 3600000) / 60000);
  document.getElementById('cd-seconds').textContent = pad((diff % 60000) / 1000);
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* === NAVBAR === */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* === FADE-UP ON SCROLL === */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

/* === RSVP CLOSED POPUP === */
const rsvpPopup = document.getElementById('rsvpPopup');
const closeRsvpPopup = () => rsvpPopup.classList.add('hidden');
document.getElementById('rsvpPopupClose').addEventListener('click', closeRsvpPopup);
document.getElementById('rsvpPopupOk').addEventListener('click', closeRsvpPopup);
rsvpPopup.addEventListener('click', (e) => { if (e.target === rsvpPopup) closeRsvpPopup(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRsvpPopup(); });
