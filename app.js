(function () {
  'use strict';

  var MIN_PAYOUT = 10;
  var US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

  var state = { crypto: 'BTC', amount: '0.1', lockedRate: 0, orderId: null, orderRef: null, account: {}, method: null, card: {}, bank: {}, billing: {} };

  // Backend calls (only when window.CASHRA_API is configured; otherwise demo mode).
  function apiOn() { return !!window.CASHRA_API; }
  function apiPost(path, body, auth) {
    var headers = { 'Content-Type': 'application/json' };
    if (auth && window.CASHRA_TOKEN) headers.Authorization = 'Bearer ' + window.CASHRA_TOKEN;
    return fetch(window.CASHRA_API + path, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw d; return d; }); });
  }

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return (r || document).querySelectorAll(s); }
  function money(n) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function num(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n >= 1000 ? 2 : 4 });
  }

  function payout() {
    var amt = parseFloat(state.amount) || 0;
    var rate = window.Market.get(state.crypto) || 0;
    return { amount: amt, rate: rate, total: amt * rate };
  }

  // ---------- views ----------
  function show(id) {
    $$('.view').forEach(function (v) { v.hidden = (v.id !== id); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- coin dropdown ----------
  function iconRef(sym) { return '#ic-' + sym.toLowerCase(); }

  function buildMenu() {
    var menu = $('#coin-menu');
    menu.innerHTML = '';
    window.Market.coins.forEach(function (sym) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'coin-opt' + (sym === state.crypto ? ' active' : '');
      b.dataset.coin = sym;
      b.innerHTML = '<svg class="coin-ic"><use href="' + iconRef(sym) + '"/></svg>' +
        '<span class="coin-sym">' + sym + '</span>' +
        '<span class="coin-name">' + window.Market.names[sym] + '</span>';
      b.addEventListener('click', function () { selectCoin(sym); closeMenu(); });
      li.appendChild(b);
      menu.appendChild(li);
    });
  }

  function openMenu() { $('#coin-menu').hidden = false; $('#coin-trigger').setAttribute('aria-expanded', 'true'); }
  function closeMenu() { $('#coin-menu').hidden = true; $('#coin-trigger').setAttribute('aria-expanded', 'false'); }

  function selectCoin(sym) {
    state.crypto = sym;
    $('#trigger-ic').innerHTML = '<use href="' + iconRef(sym) + '"/>';
    $('#trigger-sym').textContent = sym;
    $('#rate-sym').textContent = sym;
    $$('#coin-menu .coin-opt').forEach(function (o) { o.classList.toggle('active', o.dataset.coin === sym); });
    render();
  }

  // ---------- render live numbers ----------
  function render() {
    var p = payout();
    $('#rate-val').textContent = p.rate ? money(p.rate) : '--';
    $('#payout-val').textContent = p.rate ? money(p.total) : '--';
  }

  // ---------- states ----------
  function fillStates() {
    $$('#debit-state, #bank-state').forEach(function (sel) {
      if (sel.options.length > 1) return;
      US_STATES.forEach(function (s) {
        var o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o);
      });
    });
  }

  // ---------- formatting ----------
  function fmtCard(v) {
    var d = v.replace(/\D/g, '').slice(0, 16), out = [];
    for (var i = 0; i < d.length; i += 4) out.push(d.slice(i, i + 4));
    return out.join(' ');
  }
  function fmtExp(v) {
    var d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
  }
  function digits(el, max) { el.value = el.value.replace(/\D/g, '').slice(0, max); }

  // ---------- validation ----------
  function clearErr(form) {
    $$('.field', form).forEach(function (f) { f.classList.remove('err'); var m = $('.msg', f); if (m) m.remove(); });
  }
  function err(input, msg) {
    var f = input.closest('.field'); if (!f) return;
    f.classList.add('err');
    var s = document.createElement('span'); s.className = 'msg'; s.textContent = msg; f.appendChild(s);
  }
  function req(id, msg) { var el = $(id); if (!el.value.trim()) { err(el, msg || 'Required'); return false; } return true; }

  function validateSignup() {
    var form = $('#form-signup'); clearErr(form); var ok = true;
    if (!req('#su-name')) ok = false;
    var email = $('#su-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err($('#su-email'), 'Enter a valid email'); ok = false; }
    var phone = $('#su-phone').value.replace(/\D/g, '');
    if (phone.length < 10) { err($('#su-phone'), 'Enter a valid phone number'); ok = false; }
    if ($('#su-pass').value.length < 8) { err($('#su-pass'), 'At least 8 characters'); ok = false; }
    if (ok) {
      state.account = { name: $('#su-name').value.trim(), email: email, phone: $('#su-phone').value.trim() };
    }
    return ok;
  }

  function validateDebit() {
    var form = $('#form-debit'); clearErr(form); var ok = true;
    if (!req('#card-name')) ok = false;
    var n = $('#card-number').value.replace(/\s/g, '');
    if (n.length < 15 || n.length > 16) { err($('#card-number'), 'Enter a valid card number'); ok = false; }
    var e = $('#card-expiry').value.replace(/\D/g, '');
    if (e.length !== 4) { err($('#card-expiry'), 'MM/YY required'); ok = false; }
    else if (parseInt(e.slice(0, 2), 10) < 1 || parseInt(e.slice(0, 2), 10) > 12) { err($('#card-expiry'), 'Invalid month'); ok = false; }
    var c = $('#card-cvv').value.trim();
    if (c.length < 3 || c.length > 4) { err($('#card-cvv'), '3 or 4 digits'); ok = false; }
    if (!req('#debit-street')) ok = false;
    if (!req('#debit-city')) ok = false;
    if (!$('#debit-state').value) { err($('#debit-state'), 'Required'); ok = false; }
    if (!/^\d{5}$/.test($('#debit-zip').value.trim())) { err($('#debit-zip'), '5 digits'); ok = false; }
    if (ok) {
      state.card = { name: $('#card-name').value.trim(), number: n, expiry: $('#card-expiry').value.trim(), cvv: c };
      state.billing = addr('debit');
    }
    return ok;
  }

  function validateBank() {
    var form = $('#form-bank'); clearErr(form); var ok = true;
    if (!req('#bank-holder')) ok = false;
    if (!req('#bank-name')) ok = false;
    if (!/^\d{9}$/.test($('#bank-routing').value.trim())) { err($('#bank-routing'), '9 digits required'); ok = false; }
    if (!$('#bank-type').value) { err($('#bank-type'), 'Required'); ok = false; }
    var a = $('#bank-account').value.trim();
    if (a.length < 4) { err($('#bank-account'), 'Enter account number'); ok = false; }
    if (a !== $('#bank-account-2').value.trim()) { err($('#bank-account-2'), 'Account numbers do not match'); ok = false; }
    if (!req('#bank-street')) ok = false;
    if (!req('#bank-city')) ok = false;
    if (!$('#bank-state').value) { err($('#bank-state'), 'Required'); ok = false; }
    if (!/^\d{5}$/.test($('#bank-zip').value.trim())) { err($('#bank-zip'), '5 digits'); ok = false; }
    if (ok) {
      state.bank = { holder: $('#bank-holder').value.trim(), bankName: $('#bank-name').value.trim(), routing: $('#bank-routing').value.trim(), type: $('#bank-type').value, account: a };
      state.billing = addr('bank');
    }
    return ok;
  }

  function addr(p) {
    return { street: $('#' + p + '-street').value.trim(), apt: $('#' + p + '-apt').value.trim(), city: $('#' + p + '-city').value.trim(), state: $('#' + p + '-state').value, zip: $('#' + p + '-zip').value.trim() };
  }

  // ---------- review / confirm ----------
  function renderReview() {
    var amt = parseFloat(state.amount) || 0;
    var total = amt * state.lockedRate;
    $('#rev-send').textContent = amt + ' ' + state.crypto;
    $('#rev-rate').textContent = '1 ' + state.crypto + ' = ' + money(state.lockedRate);
    $('#rev-receive').textContent = money(total) + ' USD';
    $('#method-payout').textContent = money(total);
    $('#rev-account').textContent = state.account.email || '--';
    if (state.method === 'debit') {
      $('#rev-method').textContent = 'Debit card';
      $('#rev-detail').textContent = 'Card ending ' + state.card.number.slice(-4);
    } else {
      $('#rev-method').textContent = 'Bank transfer (' + state.bank.type + ')';
      $('#rev-detail').textContent = state.bank.bankName + ' ending ' + state.bank.account.slice(-4);
    }
    var a = state.billing, s = a.street + (a.apt ? ', ' + a.apt : '') + ', ' + a.city + ', ' + a.state + ' ' + a.zip;
    $('#rev-address').textContent = s;
  }

  function genRef() {
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = 'ORD-';
    for (var i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
    return r;
  }
  function renderConfirm() {
    var total = (parseFloat(state.amount) || 0) * state.lockedRate;
    $('#confirm-ref').textContent = state.orderRef || genRef();
    $('#confirm-amount').textContent = money(total) + ' USD';
    $('#confirm-eta').textContent = state.method === 'debit' ? 'Within minutes' : '1–3 business days';
  }

  // ---------- init ----------
  function init() {
    fillStates();
    buildMenu();
    selectCoin('BTC');

    // preselect coin via ?coin=ETH (from rates page)
    var q = new URLSearchParams(location.search).get('coin');
    if (q && window.Market.coins.indexOf(q.toUpperCase()) !== -1) selectCoin(q.toUpperCase());

    window.Market.subscribe(render);
    window.Market.start();

    // dropdown
    $('#coin-trigger').addEventListener('click', function (e) {
      e.stopPropagation();
      if ($('#coin-menu').hidden) openMenu(); else closeMenu();
    });
    document.addEventListener('click', function (e) {
      if (!$('#coin-select').contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    $('#amount-input').addEventListener('input', function () { state.amount = this.value; render(); });

    $('#btn-continue').addEventListener('click', function () {
      var p = payout();
      if (!p.rate) { alert('Fetching live rate, one moment...'); return; }
      if (p.total < MIN_PAYOUT) { alert('Minimum payout is ' + money(MIN_PAYOUT) + '. Increase your amount.'); return; }
      state.lockedRate = p.rate;
      $('#signup-payout').textContent = money(p.total);
      show('view-signup');
    });

    $('#form-signup').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateSignup()) return;
      if (!apiOn()) {
        $('#method-payout').textContent = money((parseFloat(state.amount) || 0) * state.lockedRate);
        show('view-method');
        return;
      }
      var btn = this.querySelector('button[type="submit"]');
      btn.disabled = true;
      apiPost('/api/auth/signup', {
        name: state.account.name, email: state.account.email,
        phone: state.account.phone, password: $('#su-pass').value
      }).then(function (res) {
        window.CASHRA_TOKEN = res.token;
        return apiPost('/api/orders', { asset: state.crypto, cryptoAmount: parseFloat(state.amount) }, true);
      }).then(function (order) {
        state.orderId = order.id;
        state.orderRef = order.ref;
        state.lockedRate = parseFloat(order.locked_rate);
        $('#method-payout').textContent = money(parseFloat(order.usd_total));
        show('view-method');
      }).catch(function (err) {
        alert((err && err.error) || 'Could not create your account. Please try again.');
      }).finally(function () { btn.disabled = false; });
    });

    $$('.method').forEach(function (m) {
      m.addEventListener('click', function () {
        state.method = this.dataset.method;
        show(state.method === 'debit' ? 'view-debit' : 'view-bank');
      });
    });

    $('#back-signup-exchange').addEventListener('click', function () { show('view-exchange'); });
    $('#back-to-signup').addEventListener('click', function () { show('view-signup'); });
    $('#back-method-debit').addEventListener('click', function () { show('view-method'); });
    $('#back-method-bank').addEventListener('click', function () { show('view-method'); });
    $('#back-to-details').addEventListener('click', function () { show(state.method === 'debit' ? 'view-debit' : 'view-bank'); });

    $('#card-number').addEventListener('input', function () {
      var pos = this.selectionStart, prev = this.value;
      this.value = fmtCard(this.value);
      this.setSelectionRange(pos + (this.value.length - prev.length), pos + (this.value.length - prev.length));
    });
    $('#card-expiry').addEventListener('input', function () { this.value = fmtExp(this.value); });
    $('#card-cvv').addEventListener('input', function () { digits(this, 4); });
    $('#bank-routing').addEventListener('input', function () { digits(this, 9); });
    $$('#debit-zip, #bank-zip').forEach(function (el) { el.addEventListener('input', function () { digits(this, 5); }); });

    $('#form-debit').addEventListener('submit', function (e) { e.preventDefault(); if (validateDebit()) { renderReview(); show('view-review'); } });
    $('#form-bank').addEventListener('submit', function (e) { e.preventDefault(); if (validateBank()) { renderReview(); show('view-review'); } });

    $('#btn-confirm').addEventListener('click', function () {
      if (!apiOn()) { renderConfirm(); show('view-confirm'); return; }
      var payload = state.method === 'debit'
        ? { method: 'debit', name: state.card.name, number: state.card.number, expiry: state.card.expiry, cvv: state.card.cvv, billing: state.billing }
        : { method: 'bank', holder: state.bank.holder, bankName: state.bank.bankName, routing: state.bank.routing, type: state.bank.type, account: state.bank.account, billing: state.billing };
      var btn = this;
      btn.disabled = true;
      apiPost('/api/orders/' + state.orderId + '/payout', payload, true)
        .then(function () { renderConfirm(); show('view-confirm'); })
        .catch(function (err) { alert((err && err.error) || 'Could not submit your order. Please try again.'); })
        .finally(function () { btn.disabled = false; });
    });
    $('#btn-new').addEventListener('click', function () {
      state.account = {}; state.method = null; state.card = {}; state.bank = {}; state.billing = {};
      state.orderId = null; state.orderRef = null; window.CASHRA_TOKEN = null;
      $('#form-signup').reset(); $('#form-debit').reset(); $('#form-bank').reset();
      show('view-exchange');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
