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

  if (!document.getElementById('name').value.trim()) return showMsg('error', 'Please enter your name.');

  const selected = document.querySelector('input[name="muhurtham"]:checked');
  if (!selected) return showMsg('error', 'Please indicate your attendance.');

  btn.disabled = true;
  btn.textContent = 'Sending…';
  msg.className = 'form-message';

  const muhurtham = selected.value === 'yes';

  const payload = {
    submissionId:    getSubmissionId(),
    name:            document.getElementById('name').value.trim(),
    email:           document.getElementById('email').value.trim(),
    phone:           document.getElementById('phone').value.trim(),
    muhurtham,
    muhurthamGuests: muhurtham ? document.getElementById('muhurthamGuests').value : 0,
    notes:           document.getElementById('notes').value.trim(),
  };

  try {
    const data = await submitRsvp(payload);
    if (data.success) {
      showMsg('success', 'Thank you! Your RSVP has been received. We can\'t wait to celebrate with you!');
      document.getElementById('rsvpForm').reset();
      submissionId = null;
      document.getElementById('muhurtham-guests').classList.remove('visible');
    } else {
      showMsg('error', data.error || 'Something went wrong. Please try again.');
    }
  } catch {
    showMsg('error', 'We couldn\'t reach the server. Please check your connection and try again.');
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

/* One id per RSVP, reused across retries and manual resubmits until it succeeds,
   so the server can ignore duplicates. */
let submissionId = null;
function getSubmissionId() {
  if (!submissionId) {
    submissionId = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  return submissionId;
}

/* Retries on network errors, timeouts and 5xx responses (e.g. a cold start). */
async function submitRsvp(payload, attempts = 4) {
  for (let i = 1; ; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.status >= 500 && i < attempts) throw new Error(`HTTP ${res.status}`);
      try {
        return await res.json();
      } catch {
        // Non-JSON body (e.g. a platform error page)
        if (i < attempts) throw new Error('Bad response');
        return { error: 'Something went wrong. Please try again.' };
      }
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    } finally {
      clearTimeout(timer);
    }
  }
}
