(function () {
  'use strict';

  function money(n) {
    if (!n) return '--';
    var dp = n >= 1000 ? 2 : (n >= 1 ? 2 : 4);
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  function build() {
    var body = document.getElementById('rates-body');
    body.innerHTML = '';
    window.Market.coins.forEach(function (sym) {
      var row = document.createElement('div');
      row.className = 'rate-item';
      row.id = 'rate-' + sym;
      row.innerHTML =
        '<div class="rate-asset"><svg class="coin-ic-lg"><use href="#ic-' + sym.toLowerCase() + '"/></svg>' +
          '<div><div class="nm">' + window.Market.names[sym] + '</div><div class="sy">' + sym + '</div></div></div>' +
        '<div class="rate-price ta-r" data-price>--</div>' +
        '<div class="rate-change ta-r flat col-change" data-change>--</div>' +
        '<div class="ta-r"><a class="btn btn-ghost" href="index.html?coin=' + sym + '">Sell</a></div>';
      body.appendChild(row);
    });
  }

  function update() {
    window.Market.coins.forEach(function (sym) {
      var row = document.getElementById('rate-' + sym);
      if (!row) return;
      var price = window.Market.get(sym);
      row.querySelector('[data-price]').textContent = money(price);
      var ch = window.Market.change(sym);
      var cell = row.querySelector('[data-change]');
      var stable = (sym === 'USDT' || sym === 'USDC');
      if (stable || Math.abs(ch) < 0.005) {
        cell.textContent = stable ? 'Pegged' : '0.00%';
        cell.className = 'rate-change ta-r flat col-change';
      } else {
        cell.textContent = (ch > 0 ? '+' : '') + ch.toFixed(2) + '%';
        cell.className = 'rate-change ta-r ' + (ch > 0 ? 'up' : 'down') + ' col-change';
      }
    });
  }

  function init() {
    build();
    window.Market.subscribe(update);
    window.Market.start();
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
