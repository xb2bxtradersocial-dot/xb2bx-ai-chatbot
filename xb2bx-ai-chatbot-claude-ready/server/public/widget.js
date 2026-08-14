/*!
 * XB2BX Assistant — self-contained chat widget.
 * One-tag integration (WordPress or any site):
 *   <script src="https://xb2bx-ai-chatbot-backend.vercel.app/widget.js" defer></script>
 * No iframe, no dependencies. Renders inside a Shadow DOM (style-isolated) and
 * talks to this same backend's /api/chat/stream (token-by-token streaming).
 *
 * v2 additions:
 *   - Tiered quick menus (main menu + sub-menus) instead of a flat 4-button list
 *   - Contextual follow-up chips after each assistant reply
 *   - "Menu" chip to reopen the main menu at any point in the conversation
 */
(function () {
  if (window.__xb2bxChat) return;
  window.__xb2bxChat = true;

  // ---- Resolve backend base from this script's own URL ----
  var self = document.currentScript;
  if (!self) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].src && ss[i].src.indexOf('widget.js') > -1) { self = ss[i]; break; }
    }
  }
  var BASE = self ? self.src.replace(/\/widget\.js(\?.*)?$/, '') : '';
  var API = BASE + '/api/chat/stream';
  var LOGO = BASE + '/logo.png';

  var CFG = {
    title: 'XB2BX Assistant',
    tagline: 'ASSISTANT • ONLINE',
    footer: 'Powered by XB2BX · AI Trade Assistant available 24/7',
    welcomeTitle: 'Welcome to XB2BX',
    welcomeText: 'Meet your AI trade assistant. Source suppliers, get quotes, and find answers — all in one friendly conversation.',
    greeting: "Hello! 👋 I'm your **XB2BX** trade assistant. Pick a topic below or just type your question — what can I do for you today?",

    // ---- Tiered menus ----------------------------------------------------
    // Each item: [emoji, label, action]
    //   action.send -> sends that text as a user message
    //   action.menu -> opens the named sub-menu
    menus: {
      main: {
        title: null,
        items: [
          ['🔎', 'Find suppliers',        { menu: 'suppliers' }],
          ['📦', 'Browse products',       { menu: 'products' }],
          ['📄', 'Request a quote (RFQ)', { send: 'I want to submit a request for quotation (RFQ).' }],
          ['🚚', 'Shipping & logistics',  { menu: 'logistics' }],
          ['💳', 'Selling & membership',  { menu: 'selling' }],
          ['💬', 'Talk to support',       { send: 'I need help from customer support.' }]
        ]
      },
      suppliers: {
        title: 'Find suppliers',
        items: [
          ['🌍', 'By country or region',   { send: 'I want to find suppliers in a specific country or region.' }],
          ['🏷️', 'By product category',    { send: 'I want to find suppliers by product category.' }],
          ['✅', 'Verified suppliers only', { send: 'How do I find verified suppliers on XB2BX?' }],
          ['🛡️', 'Check a supplier',       { send: 'How can I check a supplier before doing business with them?' }],
          ['↩️', 'Back to menu',           { menu: 'main' }]
        ]
      },
      products: {
        title: 'Browse products',
        items: [
          ['🗂️', 'All categories',     { send: 'What product categories are available on XB2BX?' }],
          ['🔤', 'Search by keyword',  { send: 'I want to search for a product by keyword.' }],
          ['⭐', 'Featured products',  { send: 'Show me featured or popular products on XB2BX.' }],
          ['↩️', 'Back to menu',       { menu: 'main' }]
        ]
      },
      logistics: {
        title: 'Shipping & logistics',
        items: [
          ['🚢', 'Shipping options',      { send: 'What shipping and freight options does XB2BX support?' }],
          ['🧾', 'Incoterms explained',   { send: 'Can you explain Incoterms and which ones XB2BX transactions use?' }],
          ['📍', 'Track an order',        { send: 'How do I track an order or shipment?' }],
          ['🛃', 'Customs & documents',   { send: 'What customs and trade documents do I need for a cross-border order?' }],
          ['↩️', 'Back to menu',          { menu: 'main' }]
        ]
      },
      selling: {
        title: 'Selling & membership',
        items: [
          ['🚀', 'Start selling',        { send: 'How do I start selling on XB2BX?' }],
          ['💼', 'Membership plans',     { send: 'What membership plans does XB2BX offer and what do they include?' }],
          ['🧾', 'Fees & payments',      { send: 'What are the fees and how do payments work for sellers on XB2BX?' }],
          ['📈', 'Grow my listings',     { send: 'How can I make my product listings perform better on XB2BX?' }],
          ['↩️', 'Back to menu',         { menu: 'main' }]
        ]
      }
    },

    // ---- Contextual follow-up chips --------------------------------------
    // Matched (top-down, first hit wins) against the user's last message once
    // the assistant reply has finished streaming. Each chip: [label, send].
    followups: [
      { re: /supplier|manufactur|factory|vendor/i, chips: [
        ['Filter by country', 'Can I filter these suppliers by country?'],
        ['Verified only', 'Show only verified suppliers.'],
        ['Request quotes', 'I want to request quotes from suppliers.']
      ]},
      { re: /rfq|quote|quotation/i, chips: [
        ['What to include', 'What should I include in my RFQ to get good responses?'],
        ['Response time', 'How long does it usually take to receive quotes?'],
        ['Compare offers', 'How do I compare and evaluate the quotes I receive?']
      ]},
      { re: /ship|freight|logistic|incoterm|customs|track/i, chips: [
        ['Estimate costs', 'How can I estimate shipping costs for my order?'],
        ['Customs documents', 'What customs documents will I need?'],
        ['Track my order', 'How do I track my shipment?']
      ]},
      { re: /sell|membership|fee|listing|plan/i, chips: [
        ['Compare plans', 'Can you compare the membership plans?'],
        ['Onboarding steps', 'What are the steps to get my company onboarded as a seller?'],
        ['Payment terms', 'How and when do sellers get paid?']
      ]},
      { re: /product|categor|catalog/i, chips: [
        ['Find suppliers for this', 'Help me find suppliers for this product.'],
        ['Request a quote', 'I want to request a quote for this product.'],
        ['Similar products', 'Show me similar or related products.']
      ]},
      { re: /support|help|problem|issue|dispute/i, chips: [
        ['Open a dispute', 'How do I open a dispute about an order?'],
        ['Contact a human', 'How do I reach a human support agent?'],
        ['Account help', 'I need help with my account settings.']
      ]}
    ],
    // Shown when nothing above matches.
    defaultChips: [
      ['Find suppliers', 'I want to find suppliers for a product.'],
      ['Request a quote', 'I want to submit a request for quotation (RFQ).'],
      ['Talk to support', 'I need help from customer support.']
    ]
  };

  function sid() {
    var k = 'xb2bx_sid', v = localStorage.getItem(k);
    if (!v) { v = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 's' + Date.now() + Math.random().toString(36).slice(2)); localStorage.setItem(k, v); }
    return v;
  }

  // ---- Minimal markdown -> HTML (bold, code, links, headings, lists, tables) ----
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function row(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  function isSep(l) { return l.indexOf('-') > -1 && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l); }
  function md(src) {
    var L = String(src).replace(/\r/g, '').split('\n'), out = '', i = 0;
    while (i < L.length) {
      var line = L[i];
      if (!line.trim()) { i++; continue; }
      if (line.indexOf('|') > -1 && i + 1 < L.length && isSep(L[i + 1])) {
        var head = row(line); i += 2; var rs = [];
        while (i < L.length && L[i].indexOf('|') > -1 && L[i].trim()) { rs.push(row(L[i])); i++; }
        out += '<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + rs.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        continue;
      }
      var h = line.match(/^(#{1,3})\s+(.*)/);
      if (h) { var n = h[1].length; out += '<h' + n + '>' + inline(h[2]) + '</h' + n + '>'; i++; continue; }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        var ol = /^\s*\d+\.\s+/.test(line), tag = ol ? 'ol' : 'ul'; out += '<' + tag + '>';
        while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) { out += '<li>' + inline(L[i].replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>'; i++; }
        out += '</' + tag + '>'; continue;
      }
      var p = [line]; i++;
      while (i < L.length && L[i].trim() && !/^\s*([-*]|\d+\.)\s+/.test(L[i]) && !/^#{1,3}\s/.test(L[i]) && !(L[i].indexOf('|') > -1 && i + 1 < L.length && isSep(L[i + 1]))) { p.push(L[i]); i++; }
      out += '<p>' + inline(p.join(' ')) + '</p>';
    }
    return out;
  }

  // ---- Fonts (injected once into the host head) ----
  if (!document.getElementById('xb2bx-fonts')) {
    var f = document.createElement('link');
    f.id = 'xb2bx-fonts'; f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap';
    document.head.appendChild(f);
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
    '.launcher{position:fixed;right:20px;bottom:20px;width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;background:rgb(255,58,89);box-shadow:0 10px 28px rgba(255,58,89,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s ease;z-index:2147483000}',
    '.launcher:hover{transform:scale(1.06)}',
    '.panel{position:fixed;right:20px;bottom:94px;width:400px;height:min(640px,calc(100vh - 120px));background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(20,20,30,.32);display:flex;flex-direction:column;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:2147483000}',
    '.panel.open{opacity:1;transform:none;pointer-events:auto}',
    '.head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:linear-gradient(135deg,rgb(255,58,89),rgb(214,36,64));color:#fff}',
    '.av{position:relative;width:44px;height:44px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:6px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.12)}',
    '.av img{width:100%;height:100%;object-fit:contain}',
    '.dot{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;background:#46c06a;border:2px solid rgb(214,36,64)}',
    '.htitle{flex:1;min-width:0}',
    '.htitle h2{font-family:"Playfair Display",Georgia,serif;font-size:20px;font-weight:600;line-height:1.1}',
    '.htitle p{font-size:10.5px;letter-spacing:1.6px;opacity:.85;margin-top:3px}',
    '.x{width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.x:hover{background:rgba(255,255,255,.28)}',
    '.body{flex:1;min-height:0;display:flex;flex-direction:column;background:#f6f7f9}',
    '.welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px 30px}',
    '.wbadge{width:104px;height:104px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;box-shadow:0 14px 34px rgba(255,58,89,.22);border:1px solid rgba(0,0,0,.08);margin-bottom:18px}',
    '.wbadge img{width:100%;height:100%;object-fit:contain}',
    '.welcome h1{font-family:"Playfair Display",Georgia,serif;font-size:29px;font-weight:600;line-height:1.15}',
    '.welcome p{color:#8a8a93;font-size:14.5px;line-height:1.6;max-width:300px;margin:10px 0 24px}',
    '.btn{display:inline-flex;align-items:center;gap:9px;background:rgb(255,58,89);color:#fff;border:none;border-radius:999px;padding:15px 28px;font-size:13px;font-weight:600;letter-spacing:1.1px;cursor:pointer;transition:background .15s ease,transform .12s ease}',
    '.btn:hover{background:rgb(214,36,64);transform:translateY(-1px)}',
    '.msgs{flex:1;min-height:0;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:12px}',
    '.row{display:flex;align-items:flex-end;gap:8px;max-width:100%}',
    '.row.u{flex-direction:row-reverse}',
    '.ma{width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px}',
    '.ma img{width:100%;height:100%;object-fit:contain}',
    '.bub{max-width:78%;padding:11px 14px;border-radius:18px;font-size:14.5px;line-height:1.55;overflow-wrap:anywhere}',
    '.bub.b{background:#fff;color:#1f2027;border:1px solid rgba(0,0,0,.08);border-bottom-left-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.04)}',
    '.bub.u{background:rgb(255,58,89);color:#fff;border-bottom-right-radius:6px;white-space:pre-wrap}',
    '.bub p{margin:0 0 8px}.bub p:last-child{margin:0}.bub strong{font-weight:700}',
    '.bub ul,.bub ol{margin:6px 0 8px;padding-left:20px}.bub li{margin:3px 0}',
    '.bub h1,.bub h2,.bub h3{font-family:"Playfair Display",Georgia,serif;margin:8px 0 6px;line-height:1.2}.bub h1{font-size:18px}.bub h2{font-size:16px}.bub h3{font-size:15px}',
    '.bub a{color:rgb(214,36,64);text-decoration:underline}',
    '.bub code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:5px;font-size:12.5px;font-family:ui-monospace,Menlo,monospace}',
    '.bub table{display:block;width:100%;overflow-x:auto;border-collapse:collapse;margin:8px 0;font-size:13px;white-space:nowrap}',
    '.bub th,.bub td{border:1px solid rgba(0,0,0,.1);padding:7px 10px;text-align:left}.bub th{background:#fff0f2;font-weight:700}',
    // Tiered quick-reply menus
    '.quick{display:flex;flex-direction:column;gap:9px;padding:2px 0 4px 38px}',
    '.qtitle{font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:#8a8a93;padding:2px 2px 0}',
    '.qr{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:13px 15px;font-size:14px;font-weight:500;color:#1f2027;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.04);transition:transform .12s ease,box-shadow .15s ease}',
    '.qr:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.09)}',
    '.qr .e{font-size:17px}',
    '.qr .more{margin-left:auto;color:#c3c3ca;font-size:13px}',
    // Contextual follow-up chips
    '.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 0 4px 38px}',
    '.chip{background:#fff;border:1px solid rgba(255,58,89,.35);color:rgb(214,36,64);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;transition:background .12s ease,transform .12s ease}',
    '.chip:hover{background:#fff0f2;transform:translateY(-1px)}',
    '.chip.menu{border-color:rgba(0,0,0,.14);color:#5a5a63}',
    '.chip.menu:hover{background:#f1f1f4}',
    '.typing{display:inline-flex;gap:5px;padding:14px 16px}',
    '.typing i{width:7px;height:7px;border-radius:50%;background:rgba(0,0,0,.32);animation:bl 1.3s infinite both}',
    '.typing i:nth-child(2){animation-delay:.18s}.typing i:nth-child(3){animation-delay:.36s}',
    '@keyframes bl{0%,80%,100%{opacity:.25}40%{opacity:1}}',
    '.composer{display:flex;align-items:center;gap:9px;padding:12px 14px;background:#fff}',
    '.composer input{flex:1;border:1px solid rgba(0,0,0,.12);background:#fff;border-radius:999px;padding:13px 17px;font-size:14.5px;color:#1f2027;outline:none}',
    '.composer input:focus{border-color:rgba(0,0,0,.25)}',
    '.send{width:46px;height:46px;flex-shrink:0;border-radius:50%;border:none;background:rgb(255,58,89);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.send:hover:not(:disabled){background:rgb(214,36,64)}.send:disabled{opacity:.45;cursor:default}',
    '.foot{text-align:center;font-size:11px;color:#8a8a93;padding:9px 14px 13px;background:#fff}',
    '@media(max-width:480px){.panel{right:0;bottom:0;width:100vw;height:100dvh;max-height:100dvh;border-radius:0}}'
  ].join('');

  var ICON_CHAT = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21V6a2 2 0 0 1 2-2z" fill="#fff"/><circle cx="9" cy="10.5" r="1.2" fill="rgb(255,58,89)"/><circle cx="12.5" cy="10.5" r="1.2" fill="rgb(255,58,89)"/><circle cx="16" cy="10.5" r="1.2" fill="rgb(255,58,89)"/></svg>';
  var ICON_X = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON_XSM = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_SEND = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---- Build DOM in a Shadow root ----
  var host = document.createElement('div');
  host.id = 'xb2bx-widget-host';
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);

  var launcher = document.createElement('button');
  launcher.className = 'launcher'; launcher.setAttribute('aria-label', 'Open chat'); launcher.innerHTML = ICON_CHAT;

  var panel = document.createElement('div'); panel.className = 'panel';
  panel.innerHTML =
    '<div class="head"><div class="av"><img src="' + LOGO + '" alt="XB2BX"/><span class="dot"></span></div>' +
    '<div class="htitle"><h2>' + CFG.title + '</h2><p>' + CFG.tagline + '</p></div>' +
    '<button class="x" aria-label="Close">' + ICON_XSM + '</button></div>' +
    '<div class="body"></div>' +
    '<div class="foot">' + CFG.footer + '</div>';
  root.appendChild(launcher); root.appendChild(panel);

  var body = panel.querySelector('.body');
  var closeBtn = panel.querySelector('.x');

  // ---- State ----
  var started = false, busy = false, convId = null, messages = [];
  var activeMenu = 'main';   // name of the menu currently shown, or null
  var chips = null;          // contextual follow-up chips, or null

  function open(v) {
    if (v) { panel.classList.add('open'); launcher.innerHTML = ICON_X; launcher.setAttribute('aria-label', 'Close chat'); if (innerWidth <= 480) launcher.style.display = 'none'; }
    else { panel.classList.remove('open'); launcher.innerHTML = ICON_CHAT; launcher.setAttribute('aria-label', 'Open chat'); launcher.style.display = 'flex'; }
  }
  launcher.onclick = function () { open(!panel.classList.contains('open')); };
  closeBtn.onclick = function () { open(false); };

  function renderWelcome() {
    body.innerHTML =
      '<div class="welcome"><div class="wbadge"><img src="' + LOGO + '" alt="XB2BX"/></div>' +
      '<h1>' + CFG.welcomeTitle + '</h1><p>' + CFG.welcomeText + '</p>' +
      '<button class="btn">✦ START CONVERSATION</button></div>';
    body.querySelector('.btn').onclick = start;
  }

  function renderChat() {
    body.innerHTML = '<div class="msgs"></div><div class="composer"><input type="text" placeholder="Write your message…" /><button class="send" aria-label="Send">' + ICON_SEND + '</button></div>';
    var input = body.querySelector('input'), send = body.querySelector('.send');
    function submit() { var t = input.value.trim(); if (!t || busy) return; input.value = ''; ask(t); }
    send.onclick = submit;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    paint();
  }

  // Pick contextual follow-ups from the user's last message.
  function pickChips() {
    var last = null;
    for (var i = messages.length - 1; i >= 0; i--) { if (messages[i].role === 'user') { last = messages[i].content; break; } }
    if (!last) return null;
    for (var j = 0; j < CFG.followups.length; j++) {
      if (CFG.followups[j].re.test(last)) return CFG.followups[j].chips;
    }
    return CFG.defaultChips;
  }

  function menuHTML(name) {
    var m = CFG.menus[name]; if (!m) return '';
    var html = '<div class="quick">';
    if (m.title) html += '<div class="qtitle">' + esc(m.title) + '</div>';
    for (var q = 0; q < m.items.length; q++) {
      var it = m.items[q];
      html += '<button class="qr" data-menu="' + esc(name) + '" data-i="' + q + '">' +
        '<span class="e">' + it[0] + '</span><span>' + esc(it[1]) + '</span>' +
        (it[2].menu && it[2].menu !== 'main' ? '<span class="more">›</span>' : '') +
        '</button>';
    }
    html += '</div>';
    return html;
  }

  function chipsHTML() {
    var html = '<div class="chips">';
    for (var c = 0; c < chips.length; c++) html += '<button class="chip" data-c="' + c + '">' + esc(chips[c][0]) + '</button>';
    html += '<button class="chip menu" data-c="menu">☰ Menu</button></div>';
    return html;
  }

  function paint() {
    var msgs = body.querySelector('.msgs'); if (!msgs) return;
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.role === 'user') html += '<div class="row u"><div class="bub u">' + esc(m.content) + '</div></div>';
      else html += '<div class="row"><div class="ma"><img src="' + LOGO + '"/></div><div class="bub b">' + md(m.content) + '</div></div>';
    }
    if (!busy) {
      if (activeMenu) html += menuHTML(activeMenu);
      else if (chips && chips.length) html += chipsHTML();
    }
    if (busy) html += '<div class="row"><div class="ma"><img src="' + LOGO + '"/></div><div class="bub b typing"><i></i><i></i><i></i></div></div>';
    msgs.innerHTML = html;

    // Menu buttons
    var qs = msgs.querySelectorAll('.qr');
    for (var k = 0; k < qs.length; k++) {
      qs[k].onclick = (function (menuName, idx) {
        return function () {
          var action = CFG.menus[menuName].items[idx][2];
          if (action.menu) { activeMenu = action.menu; paint(); }
          else if (action.send) { ask(action.send); }
        };
      })(qs[k].getAttribute('data-menu'), Number(qs[k].getAttribute('data-i')));
    }
    // Follow-up chips
    var cs = msgs.querySelectorAll('.chip');
    for (var c = 0; c < cs.length; c++) {
      cs[c].onclick = (function (key) {
        return function () {
          if (key === 'menu') { activeMenu = 'main'; chips = null; paint(); }
          else { ask(chips[Number(key)][1]); }
        };
      })(cs[c].getAttribute('data-c'));
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function start() { started = true; messages = [{ role: 'assistant', content: CFG.greeting }]; activeMenu = 'main'; chips = null; renderChat(); }

  function ask(text) {
    messages.push({ role: 'user', content: text });
    activeMenu = null; chips = null;
    busy = true; paint();
    var payload = messages.filter(function (m, i) { return !(i === 0 && m.role === 'assistant'); });
    var botIndex = -1, first = true;

    function finish() { busy = false; chips = pickChips(); paint(); }

    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: payload, session_id: sid(), conversation_id: convId }) })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        (function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finish(); return; }
            buf += dec.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              var raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
              var ev = 'message', data = '';
              raw.split('\n').forEach(function (l) { if (l.indexOf('event:') === 0) ev = l.slice(6).trim(); else if (l.indexOf('data:') === 0) data += l.slice(5).trim(); });
              if (!data) continue;
              var d; try { d = JSON.parse(data); } catch (e) { continue; }
              if (ev === 'token') {
                if (first) { first = false; busy = false; messages.push({ role: 'assistant', content: '' }); botIndex = messages.length - 1; }
                messages[botIndex].content += (d.token || ''); paint();
              } else if (ev === 'done') {
                if (d.conversation_id) convId = d.conversation_id;
                if (first && d.reply) { messages.push({ role: 'assistant', content: d.reply }); }
                finish();
              } else if (ev === 'error') {
                busy = false; chips = null;
                messages.push({ role: 'assistant', content: '⚠️ ' + (d.message || 'Something went wrong.') + '\n\nPlease try again.' }); paint();
              }
            }
            return pump();
          });
        })();
      })
      .catch(function () { busy = false; chips = null; messages.push({ role: 'assistant', content: '⚠️ Network error. Please try again in a moment.' }); paint(); });
  }

  renderWelcome();
  function mount() { document.body.appendChild(host); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
