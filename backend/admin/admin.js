'use strict';
// Admin panel logic. Same-origin calls to /api/admin/* (auth via httpOnly cookie).

const $ = (s) => document.querySelector(s);
const api = (path, opts = {}) =>
  fetch('/api/admin' + path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts })
    .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw d; return d; });

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- auth ----------
async function boot() {
  try { await api('/me'); showApp(); }
  catch { $('#login-view').hidden = false; }
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-err'); err.hidden = true;
  try {
    await api('/login', { method: 'POST', body: JSON.stringify({
      email: $('#l-email').value.trim(), password: $('#l-pass').value, otp: $('#l-otp').value.trim()
    }) });
    showApp();
  } catch (d) {
    if (d.need2fa) $('#otp-field').hidden = false;
    err.textContent = d.error || 'Sign in failed'; err.hidden = false;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  try { await api('/logout', { method: 'POST' }); } catch {}
  location.reload();
});

function showApp() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  loadDashboard();
}

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
  t.classList.add('active');
  const tab = t.dataset.tab;
  ['dashboard', 'orders', 'audit'].forEach((n) => { $('#tab-' + n).hidden = n !== tab; });
  if (tab === 'orders') loadOrders('');
  if (tab === 'audit') loadAudit();
}));

// ---------- dashboard ----------
async function loadDashboard() {
  const s = await api('/stats');
  $('#s-users').textContent = s.users;
  $('#s-orders').textContent = s.orders;
  $('#s-volume').textContent = money(s.paidVolume);

  const maxAsset = Math.max(1, ...s.topAssets.map((a) => a.n));
  $('#asset-bars').innerHTML = s.topAssets.map((a) =>
    `<div class="bar-row"><span class="lbl">${esc(a.asset)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(a.n / maxAsset * 100).toFixed(0)}%"></span></span>
      <span class="cnt">${a.n} · ${money(a.usd)}</span></div>`).join('') || '<p style="color:var(--text-3)">No orders yet.</p>';

  const maxSt = Math.max(1, ...s.byStatus.map((x) => x.n));
  $('#status-bars').innerHTML = s.byStatus.map((x) =>
    `<div class="bar-row"><span class="lbl">${esc(x.status)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(x.n / maxSt * 100).toFixed(0)}%"></span></span>
      <span class="cnt">${x.n}</span></div>`).join('') || '<p style="color:var(--text-3)">No orders yet.</p>';
}

// ---------- orders ----------
$('#order-filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('#order-filters .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  loadOrders(chip.dataset.status);
});

async function loadOrders(status) {
  const rows = await api('/orders' + (status ? '?status=' + status : ''));
  $('#orders-body').innerHTML = rows.map((o) =>
    `<tr data-id="${o.id}">
      <td class="mono">${esc(o.ref)}</td>
      <td>${esc(o.user_name)}<br><span style="color:var(--text-3);font-size:12px">${esc(o.user_email)}</span></td>
      <td>${esc(o.asset)}</td>
      <td class="mono">${esc(o.crypto_amount)}</td>
      <td class="mono">${money(o.usd_total)}</td>
      <td>${o.method ? esc(o.method) + ' ••' + esc(o.last4 || '') : '<span style="color:var(--text-3)">—</span>'}</td>
      <td><span class="pill ${esc(o.status)}">${esc(o.status.replace('_', ' '))}</span></td>
      <td style="color:var(--text-2)">${when(o.created_at)}</td>
    </tr>`).join('') || '<tr><td colspan="8" style="color:var(--text-3)">No orders.</td></tr>';

  $('#orders-body').querySelectorAll('tr[data-id]').forEach((tr) =>
    tr.addEventListener('click', () => openOrder(tr.dataset.id)));
}

// ---------- order detail (decrypt) ----------
async function openOrder(id) {
  const { order, payout } = await api('/orders/' + id);
  $('#m-title').textContent = order.ref;

  const kv = (k, v) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
  let html =
    kv('Customer', order.user_name) +
    kv('Email', order.user_email) +
    kv('Phone', order.user_phone) +
    kv('Asset', order.asset) +
    kv('Amount', order.crypto_amount + ' ' + order.asset) +
    kv('Locked rate', money(order.locked_rate)) +
    kv('USD payout', money(order.usd_total)) +
    kv('Status', order.status.replace('_', ' ')) +
    kv('Created', when(order.created_at));

  if (payout) {
    html += '<div class="sub-h">Payout details (decrypted)</div><div class="secret">';
    if (payout.method === 'debit') {
      html += kv('Method', 'Debit card') + kv('Name on card', payout.name) +
        kv('Card number', payout.number) + kv('Expiry', payout.expiry) + kv('CVV', payout.cvv);
    } else {
      html += kv('Method', 'Bank (' + payout.type + ')') + kv('Account holder', payout.holder) +
        kv('Bank', payout.bankName) + kv('Routing', payout.routing) + kv('Account', payout.account);
    }
    const b = payout.billing;
    html += kv('Billing', `${b.street}${b.apt ? ', ' + b.apt : ''}, ${b.city}, ${b.state} ${b.zip}`) + '</div>';
  } else {
    html += '<div class="sub-h">Payout details</div><p style="color:var(--text-3)">Not submitted yet.</p>';
  }

  const S = ['pending', 'crypto_received', 'paid', 'cancelled'];
  html += '<div class="actions">' + S.filter((s) => s !== order.status)
    .map((s) => `<button class="btn sm ghost" data-status="${s}">Mark ${s.replace('_', ' ')}</button>`).join('') + '</div>';

  $('#m-body').innerHTML = html;
  $('#m-body').querySelectorAll('[data-status]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api('/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status: b.dataset.status }) });
      closeModal(); loadOrders(document.querySelector('#order-filters .chip.active').dataset.status); loadDashboard();
    }));
  $('#modal').hidden = false;
}

function closeModal() { $('#modal').hidden = true; }
$('#m-close').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeModal(); });

// ---------- audit ----------
async function loadAudit() {
  const rows = await api('/audit');
  $('#audit-body').innerHTML = rows.map((a) =>
    `<tr><td style="color:var(--text-2)">${when(a.created_at)}</td><td>${esc(a.admin_email || '—')}</td>
      <td>${esc(a.action)}</td><td>${esc(a.detail || '')}</td><td class="mono" style="color:var(--text-3)">${esc(a.ip || '')}</td></tr>`
  ).join('') || '<tr><td colspan="5" style="color:var(--text-3)">No activity.</td></tr>';
}

boot();
