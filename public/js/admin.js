const esc = (str) => {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
};

async function loadRSVPs() {
  const tbody = document.getElementById('rsvp-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading…</td></tr>';

  try {
    const res   = await fetch('/api/admin/rsvps');
    const rsvps = await res.json();

    // Stats
    const total    = rsvps.length;
    const mCount   = rsvps.filter((r) => r.muhurtham).length;
    const rCount   = rsvps.filter((r) => r.reception).length;
    const mGuests  = rsvps.reduce((s, r) => s + (r.muhurtham_guests || 0), 0);
    const rGuests  = rsvps.reduce((s, r) => s + (r.reception_guests || 0), 0);

    document.getElementById('stat-total').textContent    = total;
    document.getElementById('stat-m-rsvps').textContent  = mCount;
    document.getElementById('stat-m-guests').textContent = mGuests;
    document.getElementById('stat-r-rsvps').textContent  = rCount;
    document.getElementById('stat-r-guests').textContent = rGuests;

    if (rsvps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No RSVPs yet — check back soon!</td></tr>';
      return;
    }

    tbody.innerHTML = rsvps.map((r) => `
      <tr>
        <td class="col-id">${r.id}</td>
        <td>
          <div class="guest-name">${esc(r.name)}</div>
          <div class="guest-sub">${esc(r.email)}</div>
          ${r.phone ? `<div class="guest-sub">${esc(r.phone)}</div>` : ''}
        </td>
        <td>
          <span class="badge ${r.muhurtham ? 'yes' : 'no'}">
            ${r.muhurtham ? `Yes &mdash; ${r.muhurtham_guests} guest${r.muhurtham_guests !== 1 ? 's' : ''}` : 'Not attending'}
          </span>
        </td>
        <td>
          <span class="badge ${r.reception ? 'yes' : 'no'}">
            ${r.reception ? `Yes &mdash; ${r.reception_guests} guest${r.reception_guests !== 1 ? 's' : ''}` : 'Not attending'}
          </span>
        </td>
        <td class="col-notes">${r.notes ? esc(r.notes) : '<span class="none">—</span>'}</td>
        <td class="col-date">${new Date(r.submitted_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty error">Failed to load RSVPs. Is the server running?</td></tr>`;
    console.error(err);
  }
}

document.getElementById('export-btn').addEventListener('click', () => {
  window.location.href = '/api/admin/export';
});

document.getElementById('refresh-btn').addEventListener('click', loadRSVPs);

loadRSVPs();
