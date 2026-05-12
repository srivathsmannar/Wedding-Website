/* === PAYMENT MODAL === */
const paymentModal    = document.getElementById('paymentModal');
const modalFundEl     = document.getElementById('modalFund');
const modalFundNoteEl = document.getElementById('modalFundNote');
const modalMethodEl   = document.getElementById('modalMethod');

document.querySelectorAll('.fund-pay-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const fund   = btn.dataset.fund;
    const method = btn.dataset.method.charAt(0).toUpperCase() + btn.dataset.method.slice(1);
    modalMethodEl.textContent   = method;
    modalFundEl.textContent     = fund;
    modalFundNoteEl.textContent = fund;
    paymentModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

document.getElementById('modalClose').addEventListener('click', closePaymentModal);
paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePaymentModal(); });

function closePaymentModal() {
  paymentModal.classList.remove('open');
  document.body.style.overflow = '';
}

/* === COUNTDOWN === */
function updateCountdown() {
  const target = new Date('2026-06-07T10:00:00-07:00');
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

/* === RSVP: SHOW/HIDE GUEST COUNT === */
document.querySelectorAll('input[name="muhurtham"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    document.getElementById('muhurtham-guests').classList.toggle('visible', radio.value === 'yes' && radio.checked);
  });
});

/* === RSVP FORM SUBMIT === */
document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMessage');

  const selected = document.querySelector('input[name="muhurtham"]:checked');
  if (!selected) return showMsg('error', 'Please indicate your attendance.');

  btn.disabled = true;
  btn.textContent = 'Sending…';
  msg.className = 'form-message';

  const muhurtham = selected.value === 'yes';

  const payload = {
    name:            document.getElementById('name').value.trim(),
    email:           document.getElementById('email').value.trim(),
    phone:           document.getElementById('phone').value.trim(),
    muhurtham,
    muhurthamGuests: muhurtham ? document.getElementById('muhurthamGuests').value : 0,
    notes:           document.getElementById('notes').value.trim(),
  };

  try {
    const res  = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      showMsg('success', 'Thank you! Your RSVP has been received. We can\'t wait to celebrate with you!');
      document.getElementById('rsvpForm').reset();
      document.getElementById('muhurtham-guests').classList.remove('visible');
    } else {
      showMsg('error', data.error || 'Something went wrong. Please try again.');
    }
  } catch {
    showMsg('error', 'Network error. Please check your connection and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send RSVP';
  }

  function showMsg(type, text) {
    msg.textContent = text;
    msg.className = `form-message ${type}`;
    msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
