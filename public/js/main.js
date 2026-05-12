/* === PAYMENT MODAL === */
const paymentModal    = document.getElementById('paymentModal');
const modalFundEl     = document.getElementById('modalFund');
const modalMethodEl   = document.getElementById('modalMethod');
const venmoModal      = document.getElementById('venmoModal');
const venmoModalFund  = document.getElementById('venmoModalFund');
const venmoOpenBtn    = document.getElementById('venmoOpenBtn');
const appleCashModal  = document.getElementById('appleCashModal');
const appleCashFundEl = document.getElementById('appleCashModalFund');

document.querySelectorAll('.fund-pay-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const fund   = btn.dataset.fund;
    const method = btn.dataset.method;

    closePaymentModal();
    closeVenmoModal();
    closeCardModal();
    closeAppleCashModal();

    if (method === 'applechash') {
      appleCashFundEl.textContent = fund;
      appleCashModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }

    if (method === 'venmo') {
      const note     = encodeURIComponent(fund);
      const deepLink = `venmo://paycharge?txn=pay&recipients=SulakshanaK22&note=${note}`;
      venmoModalFund.textContent = fund;
      venmoOpenBtn.href = deepLink;
      venmoOpenBtn.onclick = () => setTimeout(() => window.open('https://venmo.com/SulakshanaK22', '_blank'), 1500);
      venmoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }

    if (method === 'card' || method === 'applepay') return;

    modalMethodEl.textContent = method.charAt(0).toUpperCase() + method.slice(1);
    modalFundEl.textContent   = fund;
    paymentModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

document.getElementById('modalClose').addEventListener('click', closePaymentModal);
paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

function closePaymentModal() {
  paymentModal.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('venmoModalClose').addEventListener('click', closeVenmoModal);
venmoModal.addEventListener('click', (e) => { if (e.target === venmoModal) closeVenmoModal(); });

function closeVenmoModal() {
  venmoModal.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('appleCashModalClose').addEventListener('click', closeAppleCashModal);
appleCashModal.addEventListener('click', (e) => { if (e.target === appleCashModal) closeAppleCashModal(); });

function closeAppleCashModal() {
  appleCashModal.classList.remove('open');
  document.body.style.overflow = '';
}


/* === CARD PAYMENT MODAL === */
const cardModal       = document.getElementById('cardModal');
const cardModalFund   = document.getElementById('cardModalFund');
const cardModalMethod = document.getElementById('cardModalMethod');
const cardModalNote   = document.getElementById('cardModalNote');
const cardAmountInput = document.getElementById('cardAmount');
const cardFeeCalc     = document.getElementById('cardFeeCalc');
const cardCheckoutBtn = document.getElementById('cardCheckoutBtn');
let currentCardFund   = '';

document.querySelectorAll('.fund-pay-btn[data-method="card"], .fund-pay-btn[data-method="applepay"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentCardFund = btn.dataset.fund;
    cardModalFund.textContent = currentCardFund;
    cardModalMethod.textContent = btn.dataset.method === 'applepay' ? 'Apple Pay' : 'Credit Card';
    cardModalNote.textContent  = btn.dataset.method === 'applepay'
      ? 'Apple Pay will appear automatically on Apple devices in Safari.'
      : 'Consider using Venmo, Zelle, or Apple Cash if it is not inconvenient.';
    cardAmountInput.value = '200';
    cardAmountInput.dispatchEvent(new Event('input'));
    cardModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

cardAmountInput.addEventListener('input', () => {
  const amount = parseFloat(cardAmountInput.value);
  if (!amount || amount < 1) { cardFeeCalc.textContent = ''; cardCheckoutBtn.disabled = true; return; }
  const fee = (amount * 0.029 + 0.30).toFixed(2);
  cardFeeCalc.textContent = `Processing fee: $${fee}.`;
  cardCheckoutBtn.disabled = false;
});

cardCheckoutBtn.addEventListener('click', async () => {
  const amount = parseFloat(cardAmountInput.value);
  if (!amount || amount < 1) return;
  cardCheckoutBtn.disabled = true;
  cardCheckoutBtn.textContent = 'Redirecting…';
  try {
    const res  = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fund: currentCardFund, amount }),
    });
    const data = await res.json();
    if (data.url) { window.location.href = data.url; }
    else { alert(data.error || 'Something went wrong. Please try again.'); resetCardBtn(); }
  } catch { alert('Network error. Please try again.'); resetCardBtn(); }
});

function resetCardBtn() {
  cardCheckoutBtn.disabled = false;
  cardCheckoutBtn.textContent = 'Continue to Checkout';
}

document.getElementById('cardModalClose').addEventListener('click', closeCardModal);
cardModal.addEventListener('click', (e) => { if (e.target === cardModal) closeCardModal(); });

function closeCardModal() {
  cardModal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePaymentModal(); closeVenmoModal(); closeCardModal(); closeAppleCashModal(); }
});

/* === PAYMENT SUCCESS TOAST === */
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('payment') === 'success') {
  const fund = urlParams.get('fund') || 'your gift';
  const toast = document.createElement('div');
  toast.className = 'payment-toast';
  toast.textContent = `Thank you! Your contribution to the ${fund} means the world to us.`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-visible'), 100);
  setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 500); }, 6000);
  history.replaceState({}, '', '/');
}

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
