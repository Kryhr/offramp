/* Live market data. Binance.US WebSocket, with REST + Coinbase fallbacks. */
(function () {
  'use strict';

  // symbol -> binance pair (null = stablecoin pinned to 1.00)
  var PAIRS = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', SOL: 'SOLUSDT', USDT: null, USDC: null };

  // seed values so UI never renders empty; replaced by live data within ~1s
  var store = {
    BTC: { price: 0, open: 0 },
    ETH: { price: 0, open: 0 },
    SOL: { price: 0, open: 0 },
    USDT: { price: 1, open: 1 },
    USDC: { price: 1, open: 1 }
  };

  var subs = [];
  var ws = null;
  var pollTimer = null;
  var started = false;

  function notify() {
    for (var i = 0; i < subs.length; i++) {
      try { subs[i](store); } catch (e) {}
    }
  }

  function setPrice(sym, price, open) {
    if (!price || isNaN(price)) return;
    store[sym].price = price;
    if (open && !isNaN(open)) store[sym].open = open;
    else if (!store[sym].open) store[sym].open = price;
  }

  function liveSymbols() {
    return Object.keys(PAIRS).filter(function (s) { return PAIRS[s]; });
  }

  // ---- REST seed (fast first paint) ----
  function restSeed() {
    var syms = liveSymbols().map(function (s) { return '"' + PAIRS[s] + '"'; }).join(',');
    var url = 'https://api.binance.us/api/v3/ticker/24hr?symbols=[' + syms + ']';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('binance ' + r.status);
      return r.json();
    }).then(function (arr) {
      arr.forEach(function (t) {
        for (var sym in PAIRS) {
          if (PAIRS[sym] === t.symbol) {
            setPrice(sym, parseFloat(t.lastPrice), parseFloat(t.openPrice));
          }
        }
      });
      notify();
    });
  }

  function coinbaseSeed() {
    var jobs = liveSymbols().map(function (sym) {
      return fetch('https://api.coinbase.com/v2/prices/' + sym + '-USD/spot')
        .then(function (r) { return r.json(); })
        .then(function (d) { setPrice(sym, parseFloat(d.data.amount)); });
    });
    return Promise.all(jobs).then(notify);
  }

  // ---- WebSocket live stream ----
  function openWs() {
    var streams = liveSymbols().map(function (s) { return PAIRS[s].toLowerCase() + '@miniTicker'; }).join('/');
    try {
      ws = new WebSocket('wss://stream.binance.us:9443/stream?streams=' + streams);
    } catch (e) { startPolling(); return; }

    ws.onmessage = function (ev) {
      try {
        var msg = JSON.parse(ev.data);
        var d = msg.data;
        if (!d || !d.s) return;
        for (var sym in PAIRS) {
          if (PAIRS[sym] === d.s) {
            setPrice(sym, parseFloat(d.c), parseFloat(d.o));
            notify();
          }
        }
      } catch (e) {}
    };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
    ws.onclose = function () { if (started) startPolling(); };
  }

  // ---- REST polling fallback ----
  function pollOnce() {
    restSeed().catch(function () { coinbaseSeed().catch(function () {}); });
  }
  function startPolling() {
    if (pollTimer) return;
    pollOnce();
    pollTimer = setInterval(pollOnce, 6000);
  }

  var Market = {
    coins: ['BTC', 'ETH', 'SOL', 'USDT', 'USDC'],
    names: { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', USDT: 'Tether', USDC: 'USD Coin' },
    get: function (sym) { return store[sym] ? store[sym].price : 0; },
    change: function (sym) {
      var s = store[sym];
      if (!s || !s.open) return 0;
      return (s.price - s.open) / s.open * 100;
    },
    all: function () { return store; },
    subscribe: function (cb) { subs.push(cb); if (store.BTC.price) cb(store); },
    start: function () {
      if (started) return;
      started = true;
      restSeed().catch(function () { return coinbaseSeed().catch(function () {}); });
      if ('WebSocket' in window) openWs(); else startPolling();
    }
  };

  window.Market = Market;
})();
