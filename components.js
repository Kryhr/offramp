/* Shared chrome: SVG sprite, header, footer. Injected on every page. */
(function () {
  'use strict';

  var YEAR = new Date().getFullYear();

  /* ---- SVG sprite: real crypto logos + brand mark ---- */
  var SPRITE =
  '<svg width="0" height="0" aria-hidden="true" style="position:absolute;overflow:hidden">' +
  '<defs>' +
    '<linearGradient id="sol-grad" x1="4" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/>' +
    '</linearGradient>' +
  '</defs>' +

  /* Bitcoin */
  '<symbol id="ic-btc" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#F7931A"/>' +
    '<path fill="#fff" d="M22.5 14.06c.3-1.98-1.22-3.05-3.29-3.76l.67-2.69-1.64-.41-.65 2.62c-.43-.11-.88-.21-1.32-.31l.66-2.64-1.63-.41-.67 2.69c-.36-.08-.71-.16-1.05-.25v-.01l-2.26-.56-.44 1.75s1.22.28 1.19.3c.66.17.78.6.76.95l-.77 3.08c.05.01.11.03.18.06l-.18-.04-1.07 4.31c-.08.2-.29.5-.75.39.02.03-1.19-.3-1.19-.3l-.81 1.87 2.13.53c.4.1.79.21 1.17.31l-.68 2.72 1.63.41.67-2.7c.45.12.88.23 1.3.34l-.67 2.68 1.64.41.68-2.71c2.79.53 4.89.32 5.77-2.21.71-2.03-.04-3.2-1.51-3.97 1.07-.25 1.88-.95 2.1-2.4zm-3.75 5.24c-.5 2.03-3.92.93-5.03.66l.9-3.6c1.11.28 4.66.83 4.13 2.94zm.5-5.27c-.46 1.85-3.31.91-4.24.68l.82-3.27c.93.23 3.91.66 3.42 2.59z"/>' +
  '</symbol>' +

  /* Ethereum */
  '<symbol id="ic-eth" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#627EEA"/>' +
    '<g fill="#fff">' +
      '<path fill-opacity=".55" d="M16.5 4v8.87l7.49 3.35z"/>' +
      '<path d="M16.5 4 9 16.22l7.5-3.35z"/>' +
      '<path fill-opacity=".55" d="M16.5 21.97V28l7.5-10.38z"/>' +
      '<path d="M16.5 28v-6.03L9 17.62z"/>' +
      '<path fill-opacity=".45" d="m16.5 20.57 7.49-4.35-7.49-3.35z"/>' +
      '<path fill-opacity=".8" d="M9 16.22l7.5 4.35v-7.7z"/>' +
    '</g>' +
  '</symbol>' +

  /* Solana */
  '<symbol id="ic-sol" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#0B0B0F"/>' +
    '<g fill="url(#sol-grad)">' +
      '<path d="M10.06 20.5c.14-.14.33-.22.53-.22h14.02c.34 0 .5.4.27.65l-2.28 2.28a.75.75 0 0 1-.53.22H8.02c-.33 0-.5-.4-.26-.64z"/>' +
      '<path d="M10.06 8.79a.77.77 0 0 1 .53-.22h14.02c.34 0 .5.4.27.64l-2.28 2.29a.75.75 0 0 1-.53.22H8.02c-.33 0-.5-.4-.26-.65z"/>' +
      '<path d="M21.94 14.61a.75.75 0 0 0-.53-.22H7.39c-.34 0-.5.4-.27.65l2.28 2.28c.14.14.33.22.53.22h14.02c.33 0 .5-.4.26-.64z"/>' +
    '</g>' +
  '</symbol>' +

  /* Tether */
  '<symbol id="ic-usdt" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#26A17B"/>' +
    '<path fill="#fff" d="M17.92 17.35v-.02c-.11.01-.68.05-1.94.05-1 0-1.71-.03-1.96-.05v.02c-3.87-.17-6.76-.85-6.76-1.65 0-.81 2.89-1.48 6.76-1.65v2.62c.25.02.98.06 1.98.06 1.2 0 1.81-.05 1.92-.06v-2.62c3.86.17 6.75.85 6.75 1.65 0 .8-2.89 1.48-6.75 1.65zm0-3.57v-2.35h5.38V7.85H8.72v3.58h5.38v2.35c-4.37.2-7.66 1.07-7.66 2.1 0 1.04 3.29 1.9 7.66 2.1v7.52h3.82v-7.52c4.36-.2 7.64-1.06 7.64-2.1 0-1.03-3.28-1.9-7.64-2.1z"/>' +
  '</symbol>' +

  /* USD Coin */
  '<symbol id="ic-usdc" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#2775CA"/>' +
    '<path fill="#fff" d="M20.4 18.6c0-2.1-1.26-2.82-3.78-3.12-1.8-.24-2.16-.72-2.16-1.56s.6-1.38 1.8-1.38c1.08 0 1.68.36 1.98 1.26.06.18.24.3.42.3h.96c.24 0 .42-.18.42-.42v-.06a3 3 0 0 0-2.7-2.46v-1.44c0-.24-.18-.42-.48-.48h-.9c-.24 0-.42.18-.48.48v1.38c-1.8.24-2.94 1.44-2.94 2.94 0 1.98 1.2 2.76 3.72 3.06 1.68.3 2.22.66 2.22 1.62s-.84 1.62-1.98 1.62c-1.56 0-2.1-.66-2.28-1.56-.06-.24-.24-.36-.42-.36h-1.02c-.24 0-.42.18-.42.42v.06c.24 1.5 1.2 2.58 3.18 2.88v1.44c0 .24.18.42.48.48h.9c.24 0 .42-.18.48-.48v-1.44c1.8-.3 3-1.56 3-3.18z"/>' +
    '<path fill="#fff" d="M12.9 24.84c-4.68-1.68-7.08-6.9-5.34-11.52.9-2.52 2.88-4.44 5.34-5.34.24-.12.36-.3.36-.6v-.84c0-.24-.12-.42-.36-.48-.06 0-.18 0-.24.06a9.85 9.85 0 0 0-6.42 12.36c1.02 3.18 3.48 5.64 6.42 6.66.24.12.48 0 .54-.24.06-.06.06-.12.06-.24v-.84c0-.18-.18-.42-.36-.54zm6.42-18.84c-.24-.12-.48 0-.54.24-.06.06-.06.12-.06.24v.84c0 .24.18.48.36.6 4.68 1.68 7.08 6.9 5.34 11.52-.9 2.52-2.88 4.44-5.34 5.34-.24.12-.36.3-.36.6v.84c0 .24.12.42.36.48.06 0 .18 0 .24-.06a9.85 9.85 0 0 0 6.42-12.36c-1.02-3.24-3.54-5.7-6.42-6.72z"/>' +
  '</symbol>' +

  /* OffRamp brand mark: exit-ramp arrow on green tile */
  '<symbol id="ic-logo" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="8" fill="#0F7A4D"/>' +
    '<path d="M8 22.5 21 9.5" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M14 9.5h7v7" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
  '</symbol>' +
  '</svg>';

  function markSvg(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 32 32"><use href="#ic-logo"/></svg>';
  }

  var HEADER =
  '<div class="wrap header-in">' +
    '<a class="brand" href="index.html" aria-label="OffRamp home">' +
      markSvg('brand-mark') +
      '<span class="brand-name">OffRamp</span>' +
    '</a>' +
    '<nav class="main-nav" aria-label="Primary">' +
      '<a href="rates.html" data-nav="rates">Rates</a>' +
      '<a href="how-it-works.html" data-nav="how">How it works</a>' +
      '<a href="support.html" data-nav="support">Support</a>' +
    '</nav>' +
    '<div class="header-actions">' +
      '<a class="btn btn-ghost" href="signin.html">Sign in</a>' +
      '<a class="btn btn-brand" href="index.html">Cash out</a>' +
    '</div>' +
    '<button class="nav-toggle" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
  '</div>';

  var FOOTER =
  '<div class="wrap">' +
    '<div class="footer-top">' +
      '<div class="footer-brand-col">' +
        '<a class="brand" href="index.html">' + markSvg('brand-mark') + '<span class="brand-name">OffRamp</span></a>' +
        '<p class="footer-tagline">Convert crypto to US dollars with zero fees. Withdraw to your debit card or bank account.</p>' +
      '</div>' +
      '<div class="footer-col">' +
        '<h4>Product</h4>' +
        '<ul>' +
          '<li><a href="index.html">Cash out</a></li>' +
          '<li><a href="rates.html">Live rates</a></li>' +
          '<li><a href="how-it-works.html">How it works</a></li>' +
          '<li><a href="signin.html">Sign in</a></li>' +
        '</ul>' +
      '</div>' +
      '<div class="footer-col">' +
        '<h4>Company</h4>' +
        '<ul>' +
          '<li><a href="support.html">Support</a></li>' +
          '<li><a href="privacy.html">Privacy Policy</a></li>' +
          '<li><a href="terms.html">Terms of Service</a></li>' +
        '</ul>' +
      '</div>' +
    '</div>' +
    '<div class="footer-bottom">' +
      '<span class="footer-copy">&copy; ' + YEAR + ' OffRamp</span>' +
      '<span class="footer-disclaimer">Digital assets are volatile and their value can go down as well as up. OffRamp is a crypto-to-fiat conversion service and is not a bank or investment adviser.</span>' +
    '</div>' +
  '</div>';

  var CHAT =
  '<button class="chat-launcher" id="chat-launcher" aria-label="Open support chat" aria-expanded="false">' +
    '<svg class="ic-open" width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L4 20.5l1.4-4.6A8.4 8.4 0 1 1 21 11.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 11.5h7M8.5 8.5h7M8.5 14.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
    '<svg class="ic-close" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
  '</button>' +
  '<section class="chat-panel" id="chat-panel" role="dialog" aria-label="Support chat" hidden>' +
    '<div class="chat-head">' +
      '<span class="ch-avatar">' + markSvg('') + '</span>' +
      '<div><div class="ch-title">OffRamp Support</div><div class="ch-status"><span class="dot"></span>Typically replies in a few minutes</div></div>' +
      '<button class="chat-close" id="chat-close" aria-label="Close chat"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
    '</div>' +
    '<div class="chat-body" id="chat-body">' +
      '<div class="chat-msg bot">Hi there! 👋 Welcome to OffRamp. How can we help you cash out today?</div>' +
    '</div>' +
    '<form class="chat-foot" id="chat-form">' +
      '<input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" aria-label="Message">' +
      '<button class="chat-send" type="submit" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-3-6-7-2z" fill="currentColor"/></svg></button>' +
    '</form>' +
  '</section>';

  function wireChat() {
    var launcher = document.getElementById('chat-launcher');
    var panel = document.getElementById('chat-panel');
    var closeBtn = document.getElementById('chat-close');
    var form = document.getElementById('chat-form');
    var input = document.getElementById('chat-input');
    var body = document.getElementById('chat-body');
    if (!launcher || !panel) return;

    function open() { panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); setTimeout(function () { input.focus(); }, 50); }
    function close() { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); }
    function toggle() { if (panel.hidden) open(); else close(); }

    function addMsg(text, who) {
      var el = document.createElement('div');
      el.className = 'chat-msg ' + who;
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    launcher.addEventListener('click', toggle);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });

    var replied = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      addMsg(text, 'user');
      input.value = '';
      setTimeout(function () {
        if (!replied) {
          addMsg('Thanks for reaching out! Our team will get back to you shortly. For anything urgent about a payout, email support@offramp.example with your order reference.', 'bot');
          replied = true;
        } else {
          addMsg('Got it — we\'ve noted that and someone will follow up by email soon.', 'bot');
        }
      }, 700);
    });
  }

  function inject() {
    // sprite first so <use> references resolve
    var spriteHost = document.createElement('div');
    spriteHost.innerHTML = SPRITE;
    document.body.insertBefore(spriteHost.firstChild, document.body.firstChild);

    var header = document.querySelector('.site-header');
    if (header) header.innerHTML = HEADER;
    var footer = document.querySelector('.site-footer');
    if (footer) footer.innerHTML = FOOTER;

    // support chat (site-wide)
    var chatHost = document.createElement('div');
    chatHost.innerHTML = CHAT;
    while (chatHost.firstChild) document.body.appendChild(chatHost.firstChild);
    wireChat();

    // active nav
    var page = document.body.getAttribute('data-page');
    if (page) {
      var link = document.querySelector('.main-nav [data-nav="' + page + '"]');
      if (link) link.classList.add('active');
    }

    // mobile menu
    var toggle = document.querySelector('.nav-toggle');
    if (toggle && header) {
      toggle.addEventListener('click', function () {
        var open = header.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
