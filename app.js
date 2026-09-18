(function () {
  'use strict';

  var RATES = {
    BTC: 67432.00,
    ETH: 3521.80,
    SOL: 178.45,
    USDT: 1.00,
    USDC: 1.00
  };

  var CRYPTO_COLORS = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    SOL: '#9945FF',
    USDT: '#26A17B',
    USDC: '#2775CA'
  };

  var MIN_PAYOUT = 10;

  var US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
    'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
    'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  var state = {
    crypto: 'BTC',
    amount: '0.1',
    method: null,
    card: {},
    bank: {},
    billing: {}
  };

  var rateInterval = null;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function fmt(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function calcPayout() {
    var amt = parseFloat(state.amount) || 0;
    var rate = RATES[state.crypto] || 0;
    var total = amt * rate;
    return { total: total, rate: rate, amount: amt };
  }

  function genRef() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var ref = 'ORD-';
    for (var i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
    return ref;
  }

  // ── Views ──

  function showView(name) {
    var views = $$('.view');
    for (var i = 0; i < views.length; i++) {
      var v = views[i];
      if (v.dataset.view === name) {
        v.hidden = false;
        v.style.animation = 'none';
        void v.offsetHeight;
        v.style.animation = '';
      } else {
        v.hidden = true;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Exchange ──

  function updateExchange() {
    var p = calcPayout();
    $('#rate-text').textContent = '1 ' + state.crypto + ' = ' + fmt(p.rate);
    var el = $('#payout-amount');
    el.textContent = fmt(p.total);
  }

  function updateCryptoDot() {
    var dot = $('#crypto-dot');
    if (dot) dot.style.background = CRYPTO_COLORS[state.crypto] || '#888';
  }

  function simulateRateUpdate() {
    for (var key in RATES) {
      if (key === 'USDT' || key === 'USDC') continue;
      var drift = 1 + (Math.random() - 0.5) * 0.004;
      RATES[key] = Math.round(RATES[key] * drift * 100) / 100;
    }
    updateExchange();
  }

  // ── State selects ──

  function populateStates() {
    var selects = $$('#debit-state, #bank-state');
    for (var s = 0; s < selects.length; s++) {
      var sel = selects[s];
      if (sel.options.length > 1) continue;
      for (var i = 0; i < US_STATES.length; i++) {
        var opt = document.createElement('option');
        opt.value = US_STATES[i];
        opt.textContent = US_STATES[i];
        sel.appendChild(opt);
      }
    }
  }

  // ── Formatting ──

  function formatCardNumber(val) {
    var digits = val.replace(/\D/g, '').substring(0, 16);
    var parts = [];
    for (var i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(' ');
  }

  function formatExpiry(val) {
    var digits = val.replace(/\D/g, '').substring(0, 4);
    if (digits.length >= 3) return digits.substring(0, 2) + ' / ' + digits.substring(2);
    return digits;
  }

  // ── Validation ──

  function clearErrors(form) {
    var fields = form.querySelectorAll('.field');
    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.remove('has-error');
      var err = fields[i].querySelector('.field-error');
      if (err) err.remove();
    }
  }

  function setError(input, msg) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.add('has-error');
    var span = document.createElement('span');
    span.className = 'field-error';
    span.textContent = msg;
    field.appendChild(span);
  }

  function validateDebitForm() {
    var form = $('#form-debit');
    clearErrors(form);
    var valid = true;

    var name = $('#card-name').value.trim();
    if (!name) { setError($('#card-name'), 'Required'); valid = false; }

    var num = $('#card-number').value.replace(/\s/g, '');
    if (num.length < 15 || num.length > 16) {
      setError($('#card-number'), 'Enter a valid card number');
      valid = false;
    }

    var exp = $('#card-expiry').value.replace(/\D/g, '');
    if (exp.length !== 4) {
      setError($('#card-expiry'), 'MM/YY required');
      valid = false;
    } else {
      var mm = parseInt(exp.substring(0, 2), 10);
      if (mm < 1 || mm > 12) { setError($('#card-expiry'), 'Invalid month'); valid = false; }
    }

    var cvv = $('#card-cvv').value.trim();
    if (cvv.length < 3 || cvv.length > 4) {
      setError($('#card-cvv'), '3 or 4 digits'); valid = false;
    }

    var street = $('#debit-street').value.trim();
    if (!street) { setError($('#debit-street'), 'Required'); valid = false; }

    var city = $('#debit-city').value.trim();
    if (!city) { setError($('#debit-city'), 'Required'); valid = false; }

    var st = $('#debit-state').value;
    if (!st) { setError($('#debit-state'), 'Required'); valid = false; }

    var zip = $('#debit-zip').value.trim();
    if (!/^\d{5}$/.test(zip)) { setError($('#debit-zip'), '5 digits'); valid = false; }

    if (valid) {
      state.card = { name: name, number: num, expiry: $('#card-expiry').value.trim(), cvv: cvv };
      state.billing = {
        street: street,
        apt: $('#debit-apt').value.trim(),
        city: city,
        state: st,
        zip: zip
      };
    }
    return valid;
  }

  function validateBankForm() {
    var form = $('#form-bank');
    clearErrors(form);
    var valid = true;

    var holder = $('#bank-holder').value.trim();
    if (!holder) { setError($('#bank-holder'), 'Required'); valid = false; }

    var bankName = $('#bank-name').value.trim();
    if (!bankName) { setError($('#bank-name'), 'Required'); valid = false; }

    var routing = $('#bank-routing').value.trim();
    if (!/^\d{9}$/.test(routing)) { setError($('#bank-routing'), '9 digits required'); valid = false; }

    var acctType = $('#bank-account-type').value;
    if (!acctType) { setError($('#bank-account-type'), 'Required'); valid = false; }

    var acct = $('#bank-account').value.trim();
    if (acct.length < 4) { setError($('#bank-account'), 'Enter account number'); valid = false; }

    var acctConfirm = $('#bank-account-confirm').value.trim();
    if (acct !== acctConfirm) {
      setError($('#bank-account-confirm'), 'Account numbers do not match');
      valid = false;
    }

    var street = $('#bank-street').value.trim();
    if (!street) { setError($('#bank-street'), 'Required'); valid = false; }

    var city = $('#bank-city').value.trim();
    if (!city) { setError($('#bank-city'), 'Required'); valid = false; }

    var st = $('#bank-state').value;
    if (!st) { setError($('#bank-state'), 'Required'); valid = false; }

    var zip = $('#bank-zip').value.trim();
    if (!/^\d{5}$/.test(zip)) { setError($('#bank-zip'), '5 digits'); valid = false; }

    if (valid) {
      state.bank = {
        holder: holder, bankName: bankName, routing: routing,
        accountType: acctType, account: acct
      };
      state.billing = {
        street: street,
        apt: $('#bank-apt').value.trim(),
        city: city,
        state: st,
        zip: zip
      };
    }
    return valid;
  }

  // ── Review ──

  function renderReview() {
    var p = calcPayout();
    $('#review-send').textContent = p.amount + ' ' + state.crypto;
    $('#review-rate').textContent = '1 ' + state.crypto + ' = ' + fmt(p.rate);
    $('#review-fee').textContent = '$0.00';
    $('#review-receive').textContent = fmt(p.total) + ' USD';
    $('#method-payout').textContent = fmt(p.total);

    if (state.method === 'debit') {
      $('#review-method').textContent = 'Debit card';
      $('#review-payment-detail').textContent = 'Card ending ' + state.card.number.slice(-4);
    } else {
      $('#review-method').textContent = 'Bank transfer (' + state.bank.accountType + ')';
      $('#review-payment-detail').textContent = state.bank.bankName + ' ending ' + state.bank.account.slice(-4);
    }

    var a = state.billing;
    var addr = a.street;
    if (a.apt) addr += ', ' + a.apt;
    addr += ', ' + a.city + ', ' + a.state + ' ' + a.zip;
    $('#review-address').textContent = addr;
  }

  function renderConfirmation() {
    var p = calcPayout();
    $('#confirm-ref').textContent = genRef();
    $('#confirm-amount').textContent = fmt(p.total) + ' USD';
    $('#confirm-eta').textContent = state.method === 'debit' ? 'Within minutes' : '1–3 business days';
  }

  // ── Init ──

  function init() {
    populateStates();
    updateCryptoDot();
    updateExchange();

    rateInterval = setInterval(simulateRateUpdate, 8000);

    $('#crypto-select').addEventListener('change', function () {
      state.crypto = this.value;
      updateCryptoDot();
      updateExchange();
    });

    $('#crypto-amount').addEventListener('input', function () {
      state.amount = this.value;
      updateExchange();
    });

    $('#btn-to-payment').addEventListener('click', function () {
      var p = calcPayout();
      if (p.total < MIN_PAYOUT) {
        alert('Minimum payout is ' + fmt(MIN_PAYOUT) + '. Increase your amount.');
        return;
      }
      $('#method-payout').textContent = fmt(p.total);
      showView('method');
    });

    var methods = $$('.method-option');
    for (var i = 0; i < methods.length; i++) {
      methods[i].addEventListener('click', function () {
        state.method = this.dataset.method;
        showView(state.method === 'debit' ? 'debit' : 'bank');
      });
    }

    $('#back-to-exchange').addEventListener('click', function () { showView('exchange'); });
    $('#back-to-method-debit').addEventListener('click', function () { showView('method'); });
    $('#back-to-method-bank').addEventListener('click', function () { showView('method'); });
    $('#back-to-details').addEventListener('click', function () {
      showView(state.method === 'debit' ? 'debit' : 'bank');
    });

    $('#card-number').addEventListener('input', function () {
      var pos = this.selectionStart;
      var prev = this.value;
      this.value = formatCardNumber(this.value);
      var diff = this.value.length - prev.length;
      this.setSelectionRange(pos + diff, pos + diff);
    });

    $('#card-expiry').addEventListener('input', function () {
      this.value = formatExpiry(this.value);
    });

    $('#card-cvv').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });

    $('#bank-routing').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').substring(0, 9);
    });

    var zips = $$('#debit-zip, #bank-zip');
    for (var z = 0; z < zips.length; z++) {
      zips[z].addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 5);
      });
    }

    $('#form-debit').addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateDebitForm()) { renderReview(); showView('review'); }
    });

    $('#form-bank').addEventListener('submit', function (e) {
      e.preventDefault();
      if (validateBankForm()) { renderReview(); showView('review'); }
    });

    $('#btn-confirm').addEventListener('click', function () {
      renderConfirmation();
      showView('confirmation');
    });

    $('#btn-new-order').addEventListener('click', function () {
      state.method = null;
      state.card = {};
      state.bank = {};
      state.billing = {};
      $('#form-debit').reset();
      $('#form-bank').reset();
      showView('exchange');
    });

    var toggle = $('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var nav = $('.nav');
        var open = nav.classList.toggle('open');
        this.setAttribute('aria-expanded', String(open));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
