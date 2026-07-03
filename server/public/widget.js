/*!
 * XB2BX Assistant — self-contained chat widget (v2).
 * One-tag integration (WordPress or any site):
 *   <script src="https://xb2bx-ai-chatbot-backend.vercel.app/widget.js" defer></script>
 * No iframe, no dependencies. Renders inside an open Shadow DOM (style-isolated)
 * and talks to this same backend's /api/chat/stream (token-by-token streaming).
 *
 * v2 highlights:
 *  - XB2BX house design system: navy #07111f, cyan #27e0e0, gold #c8a84b,
 *    Syne display / DM Sans body / JetBrains Mono code
 *  - Incremental rendering: only the streaming bubble updates per token
 *    (no full-list innerHTML repaints, no logo flicker, text stays selectable)
 *  - Smart autoscroll: follows the stream only if you're at the bottom,
 *    otherwise shows a "jump to latest" pill
 *  - Stop-generation button (AbortController) + Retry on error
 *  - Conversation survives page navigation (sessionStorage) + restart action
 *  - Escape-to-close, aria-live message log, focus management,
 *    prefers-reduced-motion, iOS safe-area insets
 */
(function () {
  'use strict';
  if (window.__xb2bxChat) return;
  window.__xb2bxChat = true;

  /* ---------------- Backend base from this script's own URL ---------------- */
  var self = document.currentScript;
  if (!self) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].src && ss[i].src.indexOf('widget.js') > -1) { self = ss[i]; break; }
    }
  }
  var BASE = self ? self.src.replace(/\/widget\.js(\?.*)?$/, '') : '';
  if (!BASE) {
    if (window.console && console.warn) console.warn('[XB2BX Assistant] Could not resolve widget base URL — widget not mounted.');
    return;
  }
  var API = BASE + '/api/chat/stream';
  var LOGO = BASE + '/logo.png';

  /* ---------------- Config ---------------- */
  var CFG = {
    title: 'XB2BX Assistant',
    tagline: 'AI TRADE ASSISTANT',
    footer: 'Powered by XB2BX \u00b7 Available 24/7',
    welcomeTitle: 'Welcome to XB2BX',
    welcomeText: 'Your AI trade assistant. Source suppliers, get quotes and find answers \u2014 all in one conversation.',
    greeting: "Hello! I'm your **XB2BX** trade assistant. Ask me about products, suppliers, RFQs, selling, or membership \u2014 what can I do for you today?",
    quick: [
      ['\ud83d\udd0e', 'Find suppliers', 'I want to find suppliers for a product.'],
      ['\ud83d\udce6', 'Browse products', 'What product categories are available on XB2BX?'],
      ['\ud83d\udcb3', 'Selling & membership', 'How do I start selling on XB2BX?'],
      ['\ud83d\udcac', 'Talk to support', 'I need help from customer support.']
    ]
  };

  /* ---------------- Design tokens (XB2BX house system) ---------------- */
  var NAVY = '#07111f';
  var NAVY2 = '#0b1a30';
  var CYAN = '#27e0e0';
  var CYAN_DK = '#0e9e9e';
  var GOLD = '#c8a84b';
  var Z = 2147483000;

  /* ---------------- Session id ---------------- */
  function sid() {
    var k = 'xb2bx_sid', v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (!v) {
      v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 's' + Date.now() + Math.random().toString(36).slice(2);
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  }

  /* ---------------- Minimal markdown -> HTML ---------------- */
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

  /* ---------------- Fonts (ID-guarded, injected once into host head) ---------------- */
  if (!document.getElementById('xb2bx-fonts')) {
    var f = document.createElement('link');
    f.id = 'xb2bx-fonts'; f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(f);
  }

  /* ---------------- Styles (fully encapsulated in the shadow root) ---------------- */
  var CSS = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    'button{font:inherit;-webkit-tap-highlight-color:transparent}',
    '.xb{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',

    /* ---- Launcher ---- */
    '.launcher{position:fixed;z-index:' + Z + ';right:max(20px, env(safe-area-inset-right,0px));',
    '  bottom:max(20px, env(safe-area-inset-bottom,0px));width:62px;height:62px;border-radius:50%;padding:0;cursor:pointer;',
    '  border:1px solid rgba(39,224,224,.35);',
    '  background:radial-gradient(120% 120% at 30% 25%, ' + NAVY2 + ' 0%, ' + NAVY + ' 62%);',
    '  box-shadow:0 10px 30px rgba(7,17,31,.45);display:flex;align-items:center;justify-content:center;',
    '  transition:transform .18s cubic-bezier(.2,.9,.3,1.4), box-shadow .25s ease, border-color .25s ease}',
    '.launcher:hover{transform:translateY(-2px) scale(1.05);border-color:rgba(39,224,224,.8);',
    '  box-shadow:0 14px 34px rgba(7,17,31,.5),0 0 22px rgba(39,224,224,.35)}',
    '.launcher:active{transform:scale(.96)}',
    '.launcher:focus-visible{outline:2px solid ' + CYAN + ';outline-offset:3px}',
    '@keyframes pulse{0%{box-shadow:0 10px 30px rgba(7,17,31,.45),0 0 0 0 rgba(39,224,224,.40)}',
    '  70%{box-shadow:0 10px 30px rgba(7,17,31,.45),0 0 0 14px rgba(39,224,224,0)}',
    '  100%{box-shadow:0 10px 30px rgba(7,17,31,.45),0 0 0 0 rgba(39,224,224,0)}}',
    '.launcher.pulse{animation:pulse 2.6s ease-out infinite}',
    '.ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    '  transition:opacity .18s ease, transform .22s cubic-bezier(.2,.9,.3,1.3)}',
    '.ic-x{opacity:0;transform:rotate(-90deg) scale(.6)}',
    '.launcher.on .ic-chat{opacity:0;transform:rotate(90deg) scale(.6)}',
    '.launcher.on .ic-x{opacity:1;transform:rotate(0) scale(1)}',

    /* ---- Panel ---- */
    '.panel{position:fixed;z-index:' + Z + ';right:20px;bottom:94px;width:400px;',
    '  height:min(680px, calc(100vh - 120px));border-radius:18px;overflow:hidden;',
    '  background:#f2f6f9;border:1px solid rgba(39,224,224,.28);',
    '  box-shadow:0 24px 64px rgba(7,17,31,.5);display:flex;flex-direction:column;',
    '  opacity:0;pointer-events:none;transform:translateY(18px) scale(.97);transform-origin:bottom right;',
    '  transition:opacity .22s ease, transform .26s cubic-bezier(.2,.9,.3,1.25)}',
    '.panel.open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}',

    /* ---- Header ---- */
    '.head{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:14px 16px;',
    '  background:linear-gradient(180deg, ' + NAVY2 + ' 0%, ' + NAVY + ' 100%);',
    '  border-bottom:1px solid rgba(39,224,224,.18)}',
    '.av{position:relative;width:42px;height:42px;border-radius:50%;background:#fff;flex:0 0 auto;',
    '  display:flex;align-items:center;justify-content:center;overflow:visible;padding:0;',
    '  box-shadow:0 0 0 2px rgba(39,224,224,.45), 0 4px 12px rgba(0,0,0,.35)}',
    '.av .avi{width:100%;height:100%;border-radius:50%;overflow:hidden;padding:6px}',
    '.av img{width:100%;height:100%;object-fit:contain;display:block}',
    '.dot{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;',
    '  background:' + CYAN + ';border:2px solid ' + NAVY + ';box-shadow:0 0 8px rgba(39,224,224,.9)}',
    '.htitle{flex:1;min-width:0}',
    '.htitle h2{font-family:Syne,Georgia,serif;font-size:17px;font-weight:700;line-height:1.15;color:#eaf6f6;letter-spacing:.01em}',
    '.htitle p{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:9.5px;letter-spacing:2px;color:' + CYAN + ';opacity:.85;margin-top:4px}',
    '.hbtn{width:30px;height:30px;flex:0 0 auto;border:none;border-radius:8px;background:transparent;color:#9fb3c8;',
    '  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s ease,color .15s ease}',
    '.hbtn:hover{background:rgba(255,255,255,.08);color:#fff}',
    '.hbtn:focus-visible{outline:2px solid ' + CYAN + ';outline-offset:2px}',

    /* ---- Body / welcome ---- */
    '.body{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}',
    '.welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;',
    '  padding:28px 30px;background:linear-gradient(180deg,#fdfefe 0%,#eef4f8 100%)}',
    '.wbadge{width:100px;height:100px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;',
    '  padding:20px;margin-bottom:20px;',
    '  box-shadow:0 0 0 2px rgba(39,224,224,.5), 0 0 0 6px rgba(200,168,75,.18), 0 16px 36px rgba(7,17,31,.16)}',
    '.wbadge img{width:100%;height:100%;object-fit:contain}',
    '.welcome h1{font-family:Syne,Georgia,serif;font-size:26px;font-weight:800;line-height:1.15;color:' + NAVY + '}',
    '.welcome p{color:#5c6b7c;font-size:14.5px;line-height:1.6;max-width:300px;margin:10px 0 26px}',
    '.cta{display:inline-flex;align-items:center;gap:9px;border:none;border-radius:999px;padding:15px 30px;cursor:pointer;',
    '  background:' + NAVY + ';color:' + CYAN + ';font-family:"JetBrains Mono",ui-monospace,monospace;',
    '  font-size:12px;font-weight:600;letter-spacing:1.6px;',
    '  box-shadow:0 0 0 1px rgba(39,224,224,.45) inset, 0 10px 26px rgba(7,17,31,.28);',
    '  transition:transform .15s ease, box-shadow .2s ease}',
    '.cta:hover{transform:translateY(-1px);box-shadow:0 0 0 1px rgba(39,224,224,.8) inset, 0 0 18px rgba(39,224,224,.3), 0 12px 28px rgba(7,17,31,.3)}',
    '.cta:focus-visible{outline:2px solid ' + CYAN + ';outline-offset:3px}',

    /* ---- Messages ---- */
    '.msgs{flex:1;min-height:0;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:12px;',
    '  scrollbar-width:thin;scrollbar-color:rgba(7,17,31,.25) transparent}',
    '.msgs::-webkit-scrollbar{width:6px}.msgs::-webkit-scrollbar-thumb{background:rgba(7,17,31,.22);border-radius:3px}',
    '.row{display:flex;align-items:flex-end;gap:8px;max-width:100%;animation:rise .22s ease both}',
    '@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
    '.row.u{flex-direction:row-reverse}',
    '.ma{width:28px;height:28px;border-radius:50%;background:#fff;border:1px solid rgba(39,224,224,.4);',
    '  display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;padding:4px}',
    '.ma img{width:100%;height:100%;object-fit:contain}',
    '.bub{max-width:80%;padding:11px 14px;border-radius:16px;font-size:14.5px;line-height:1.55;overflow-wrap:anywhere;color:#182433}',
    '.bub.b{background:#fff;border:1px solid rgba(7,17,31,.08);border-bottom-left-radius:5px;box-shadow:0 2px 10px rgba(7,17,31,.05)}',
    '.bub.u{background:linear-gradient(135deg, ' + NAVY2 + ' 0%, ' + NAVY + ' 100%);color:#f2fbfb;',
    '  border:1px solid rgba(39,224,224,.3);border-bottom-right-radius:5px;white-space:pre-wrap}',
    '.bub p{margin:0 0 8px}.bub p:last-child{margin:0}.bub strong{font-weight:700}',
    '.bub ul,.bub ol{margin:6px 0 8px;padding-left:20px}.bub li{margin:3px 0}',
    '.bub h1,.bub h2,.bub h3{font-family:Syne,Georgia,serif;margin:8px 0 6px;line-height:1.2;color:' + NAVY + '}',
    '.bub h1{font-size:17px}.bub h2{font-size:15.5px}.bub h3{font-size:14.5px}',
    '.bub a{color:' + CYAN_DK + ';text-decoration:underline;text-underline-offset:2px}',
    '.bub code{background:rgba(7,17,31,.06);padding:1px 5px;border-radius:5px;font-size:12.5px;',
    '  font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;color:' + NAVY + '}',
    '.bub.u code{background:rgba(255,255,255,.14);color:' + CYAN + '}',
    '.bub table{display:block;width:100%;overflow-x:auto;border-collapse:collapse;margin:8px 0;font-size:13px;white-space:nowrap}',
    '.bub th,.bub td{border:1px solid rgba(7,17,31,.12);padding:7px 10px;text-align:left}',
    '.bub th{background:#e9f6f6;font-weight:700;color:' + NAVY + '}',
    '.bub .caret{display:inline-block;width:7px;height:15px;vertical-align:-2px;margin-left:2px;',
    '  background:' + CYAN + ';border-radius:2px;animation:blink 1s steps(1) infinite}',
    '@keyframes blink{50%{opacity:0}}',

    /* Error bubble + retry */
    '.bub.err{background:#fff6f6;border-color:rgba(200,60,60,.25)}',
    '.retry{margin-top:8px;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(7,17,31,.2);',
    '  background:#fff;color:' + NAVY + ';border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;cursor:pointer;',
    '  transition:border-color .15s ease, box-shadow .15s ease}',
    '.retry:hover{border-color:' + CYAN_DK + ';box-shadow:0 0 0 3px rgba(39,224,224,.15)}',

    /* Quick replies */
    '.quick{display:flex;flex-direction:column;gap:9px;padding:2px 0 4px 36px}',
    '.qr{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:#fff;',
    '  border:1px solid rgba(7,17,31,.08);border-radius:14px;padding:12px 15px;font-size:14px;font-weight:500;',
    '  color:#182433;cursor:pointer;box-shadow:0 2px 8px rgba(7,17,31,.04);',
    '  transition:transform .12s ease, box-shadow .15s ease, border-color .15s ease}',
    '.qr:hover{transform:translateY(-1px);border-color:rgba(39,224,224,.6);box-shadow:0 6px 16px rgba(7,17,31,.08)}',
    '.qr:focus-visible{outline:2px solid ' + CYAN_DK + ';outline-offset:2px}',
    '.qr .e{font-size:17px}',

    /* Typing */
    '.typing{display:inline-flex;gap:5px;padding:14px 16px}',
    '.typing i{width:7px;height:7px;border-radius:50%;background:' + CYAN_DK + ';animation:bl 1.3s infinite both}',
    '.typing i:nth-child(2){animation-delay:.18s}.typing i:nth-child(3){animation-delay:.36s}',
    '@keyframes bl{0%,80%,100%{opacity:.25}40%{opacity:1}}',

    /* Jump-to-latest pill */
    '.jump{position:absolute;left:50%;bottom:86px;transform:translate(-50%,6px);opacity:0;pointer-events:none;',
    '  display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(39,224,224,.5);border-radius:999px;',
    '  background:' + NAVY + ';color:' + CYAN + ';font-size:12px;font-weight:600;padding:7px 14px;cursor:pointer;',
    '  box-shadow:0 8px 20px rgba(7,17,31,.35);transition:opacity .18s ease, transform .18s ease;z-index:2}',
    '.jump.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}',

    /* Composer */
    '.composer{flex:0 0 auto;display:flex;align-items:flex-end;gap:9px;padding:12px 14px;background:#fff;',
    '  border-top:1px solid rgba(7,17,31,.06)}',
    '.composer textarea{flex:1;resize:none;border:1px solid rgba(7,17,31,.14);background:#fff;border-radius:20px;',
    '  padding:12px 17px;font:500 14.5px/1.4 "DM Sans",sans-serif;color:#182433;outline:none;max-height:112px;',
    '  transition:border-color .15s ease, box-shadow .15s ease}',
    '.composer textarea:focus{border-color:' + CYAN_DK + ';box-shadow:0 0 0 3px rgba(39,224,224,.16)}',
    '.composer textarea::placeholder{color:#93a1b0}',
    '.send{width:46px;height:46px;flex-shrink:0;border-radius:50%;border:none;cursor:pointer;',
    '  background:' + NAVY + ';color:' + CYAN + ';display:flex;align-items:center;justify-content:center;',
    '  box-shadow:0 0 0 1px rgba(39,224,224,.4) inset;transition:box-shadow .15s ease, opacity .15s ease}',
    '.send:hover:not(:disabled){box-shadow:0 0 0 1px rgba(39,224,224,.9) inset, 0 0 14px rgba(39,224,224,.3)}',
    '.send:disabled{opacity:.4;cursor:default}',
    '.send:focus-visible{outline:2px solid ' + CYAN_DK + ';outline-offset:2px}',
    '.foot{flex:0 0 auto;text-align:center;font-size:11px;color:#8a97a5;padding:8px 14px 12px;background:#fff}',
    '.foot b{color:' + GOLD + ';font-weight:700}',

    /* Mobile */
    '@media (max-width:480px){',
    '  .panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0;border:none;transform:translateY(24px)}',
    '  .panel.open{transform:translateY(0)}',
    '  .head{padding-top:max(14px, env(safe-area-inset-top,0px))}',
    '  .composer{padding-bottom:max(12px, env(safe-area-inset-bottom,0px))}',
    '}',

    /* Reduced motion */
    '@media (prefers-reduced-motion:reduce){',
    '  .launcher,.panel,.ic,.row,.jump,.cta,.qr{transition:none !important;animation:none !important}',
    '  .launcher.pulse{animation:none}',
    '  .bub .caret{animation:none}',
    '}'
  ].join('\n');

  /* ---------------- Icons ---------------- */
  var ICON_CHAT = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21V6a2 2 0 0 1 2-2z" fill="' + CYAN + '"/><circle cx="9" cy="10.5" r="1.2" fill="' + NAVY + '"/><circle cx="12.5" cy="10.5" r="1.2" fill="' + NAVY + '"/><circle cx="16" cy="10.5" r="1.2" fill="' + NAVY + '"/></svg>';
  var ICON_X = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="' + CYAN + '" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON_XSM = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var ICON_RESTART = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 9A8 8 0 0 0 6.5 5.5L4 8m0 7a8 8 0 0 0 13.5 3.5L20 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_SEND = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_STOP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>';
  var ICON_DOWN = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------- DOM in an open Shadow root ---------------- */
  var host = document.createElement('div');
  host.id = 'xb2bx-widget-host';
  var root = host.attachShadow({ mode: 'open' });
  var style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'xb launcher pulse';
  launcher.setAttribute('aria-label', 'Open XB2BX Assistant');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<span class="ic ic-chat">' + ICON_CHAT + '</span><span class="ic ic-x">' + ICON_X + '</span>';

  var panel = document.createElement('div');
  panel.className = 'xb panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'XB2BX Assistant chat');
  panel.innerHTML =
    '<div class="head">' +
    '  <div class="av"><span class="avi"><img src="' + LOGO + '" alt=""/></span><span class="dot"></span></div>' +
    '  <div class="htitle"><h2>' + CFG.title + '</h2><p>' + CFG.tagline + '</p></div>' +
    '  <button type="button" class="hbtn restart" aria-label="Start a new conversation" title="New conversation">' + ICON_RESTART + '</button>' +
    '  <button type="button" class="hbtn close" aria-label="Close chat" title="Close">' + ICON_XSM + '</button>' +
    '</div>' +
    '<div class="body"></div>' +
    '<div class="foot">' + CFG.footer + '</div>';

  root.appendChild(launcher);
  root.appendChild(panel);

  var body = panel.querySelector('.body');
  var restartBtn = panel.querySelector('.restart');
  var closeBtn = panel.querySelector('.close');

  /* ---------------- State ---------------- */
  var STATE_KEY = 'xb2bx_chat_state_v2';
  var isOpen = false, started = false, busy = false, convId = null, messages = [];
  var lastFocus = null, lastUserText = null, aborter = null;
  var msgsEl = null, inputEl = null, sendEl = null, jumpEl = null;
  var typingRow = null, streamBub = null;

  function saveState() {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ started: started, convId: convId, messages: messages }));
    } catch (e) {}
  }
  function loadState() {
    try {
      var raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.started && s.messages && s.messages.length) {
        started = true; convId = s.convId || null; messages = s.messages;
      }
    } catch (e) {}
  }

  /* ---------------- Open / close ---------------- */
  function setOpen(v) {
    if (v === isOpen) return;
    isOpen = v;
    if (isOpen) {
      lastFocus = document.activeElement;
      launcher.classList.remove('pulse');
      launcher.classList.add('on');
      launcher.setAttribute('aria-label', 'Close XB2BX Assistant');
      launcher.setAttribute('aria-expanded', 'true');
      panel.classList.add('open');
      if (window.innerWidth <= 480) launcher.style.display = 'none';
      if (started && inputEl) inputEl.focus({ preventScroll: true });
      if (msgsEl) scrollBottom(true);
    } else {
      launcher.classList.remove('on');
      launcher.setAttribute('aria-label', 'Open XB2BX Assistant');
      launcher.setAttribute('aria-expanded', 'false');
      panel.classList.remove('open');
      launcher.style.display = 'flex';
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  launcher.addEventListener('click', function () { setOpen(!isOpen); });
  closeBtn.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) setOpen(false); });

  /* ---------------- Welcome screen ---------------- */
  function renderWelcome() {
    body.innerHTML =
      '<div class="welcome">' +
      '  <div class="wbadge"><img src="' + LOGO + '" alt="XB2BX"/></div>' +
      '  <h1>' + CFG.welcomeTitle + '</h1>' +
      '  <p>' + CFG.welcomeText + '</p>' +
      '  <button type="button" class="cta">START CONVERSATION</button>' +
      '</div>';
    body.querySelector('.cta').addEventListener('click', start);
    msgsEl = inputEl = sendEl = jumpEl = null;
  }

  /* ---------------- Chat screen (built once; messages appended incrementally) ---------------- */
  function renderChat() {
    body.innerHTML =
      '<div class="msgs" role="log" aria-live="polite" aria-label="Conversation"></div>' +
      '<button type="button" class="jump">' + ICON_DOWN + ' Latest</button>' +
      '<div class="composer">' +
      '  <textarea rows="1" placeholder="Write your message\u2026" aria-label="Your message"></textarea>' +
      '  <button type="button" class="send" aria-label="Send message">' + ICON_SEND + '</button>' +
      '</div>';
    msgsEl = body.querySelector('.msgs');
    jumpEl = body.querySelector('.jump');
    inputEl = body.querySelector('textarea');
    sendEl = body.querySelector('.send');

    inputEl.addEventListener('input', autosize);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
    });
    sendEl.addEventListener('click', function () { busy ? stop() : submit(); });
    msgsEl.addEventListener('scroll', updateJump);
    jumpEl.addEventListener('click', function () { scrollBottom(true); });

    for (var i = 0; i < messages.length; i++) addRow(messages[i].role, messages[i].content, false);
    maybeQuick();
    scrollBottom(true);
  }

  function autosize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 112) + 'px';
  }

  /* ---------------- Message rendering (incremental) ---------------- */
  function atBottom() {
    return msgsEl && (msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight) < 90;
  }
  function scrollBottom(force) {
    if (!msgsEl) return;
    if (force || atBottom()) msgsEl.scrollTop = msgsEl.scrollHeight;
    updateJump();
  }
  function updateJump() {
    if (jumpEl) jumpEl.classList.toggle('show', !atBottom());
  }

  function addRow(role, content, follow) {
    var rowEl = document.createElement('div');
    var bub;
    if (role === 'user') {
      rowEl.className = 'row u';
      bub = document.createElement('div');
      bub.className = 'bub u';
      bub.textContent = content;
      rowEl.appendChild(bub);
    } else {
      rowEl.className = 'row';
      rowEl.innerHTML = '<div class="ma"><img src="' + LOGO + '" alt=""/></div>';
      bub = document.createElement('div');
      bub.className = 'bub b';
      bub.innerHTML = md(content);
      rowEl.appendChild(bub);
    }
    msgsEl.appendChild(rowEl);
    if (follow !== false) scrollBottom(false);
    return bub;
  }

  function showTyping() {
    hideTyping();
    typingRow = document.createElement('div');
    typingRow.className = 'row';
    typingRow.innerHTML = '<div class="ma"><img src="' + LOGO + '" alt=""/></div>' +
      '<div class="bub b typing"><i></i><i></i><i></i></div>';
    msgsEl.appendChild(typingRow);
    scrollBottom(false);
  }
  function hideTyping() {
    if (typingRow && typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
    typingRow = null;
  }

  var quickEl = null;
  function maybeQuick() {
    removeQuick();
    var noUser = !messages.some(function (m) { return m.role === 'user'; });
    if (!(started && noUser)) return;
    quickEl = document.createElement('div');
    quickEl.className = 'quick';
    var html = '';
    for (var q = 0; q < CFG.quick.length; q++) {
      html += '<button type="button" class="qr" data-q="' + q + '"><span class="e">' + CFG.quick[q][0] + '</span><span>' + esc(CFG.quick[q][1]) + '</span></button>';
    }
    quickEl.innerHTML = html;
    quickEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.qr') : null;
      if (b) ask(CFG.quick[Number(b.getAttribute('data-q'))][2]);
    });
    msgsEl.appendChild(quickEl);
    scrollBottom(false);
  }
  function removeQuick() {
    if (quickEl && quickEl.parentNode) quickEl.parentNode.removeChild(quickEl);
    quickEl = null;
  }

  function addError(msg, canRetry) {
    var bub = addRow('assistant', '');
    bub.classList.add('err');
    bub.innerHTML = '<p>\u26a0\ufe0f ' + esc(msg || 'Something went wrong.') + '</p>';
    if (canRetry && lastUserText) {
      var r = document.createElement('button');
      r.type = 'button'; r.className = 'retry'; r.textContent = 'Try again';
      r.addEventListener('click', function () {
        var t = lastUserText;
        // Remove the failed user turn from history so retry doesn't duplicate it.
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') { messages.splice(i, 1); break; }
        }
        if (bub.parentNode && bub.parentNode.parentNode) bub.parentNode.parentNode.removeChild(bub.parentNode);
        ask(t);
      });
      bub.appendChild(r);
    }
    scrollBottom(false);
  }

  /* ---------------- Busy / send-stop toggle ---------------- */
  function setBusy(v) {
    busy = v;
    if (!sendEl) return;
    sendEl.innerHTML = busy ? ICON_STOP : ICON_SEND;
    sendEl.setAttribute('aria-label', busy ? 'Stop generating' : 'Send message');
  }

  function stop() {
    if (aborter) { try { aborter.abort(); } catch (e) {} }
  }

  /* ---------------- Conversation flow ---------------- */
  function start() {
    started = true;
    messages = [{ role: 'assistant', content: CFG.greeting }];
    saveState();
    renderChat();
    if (inputEl) inputEl.focus({ preventScroll: true });
  }

  function restart() {
    stop();
    convId = null; started = false; busy = false; messages = [];
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}
    renderWelcome();
  }
  restartBtn.addEventListener('click', restart);

  function submit() {
    if (!inputEl) return;
    var t = inputEl.value.trim();
    if (!t || busy) return;
    inputEl.value = ''; autosize();
    ask(t);
  }

  function ask(text) {
    removeQuick();
    lastUserText = text;
    messages.push({ role: 'user', content: text });
    saveState();
    addRow('user', text);
    scrollBottom(true);
    setBusy(true);
    showTyping();

    var payload = messages.filter(function (m, i) { return !(i === 0 && m.role === 'assistant'); });
    var acc = '', first = true;
    streamBub = null;
    aborter = (typeof AbortController !== 'undefined') ? new AbortController() : null;

    function beginStream() {
      hideTyping();
      streamBub = addRow('assistant', '');
      streamBub.innerHTML = '<span class="caret"></span>';
    }
    function renderStream(final) {
      if (!streamBub) return;
      streamBub.innerHTML = md(acc) + (final ? '' : '<span class="caret"></span>');
      scrollBottom(false);
    }
    function finalize(saveMsg) {
      hideTyping();
      if (streamBub && acc) renderStream(true);
      if (saveMsg && acc) { messages.push({ role: 'assistant', content: acc }); saveState(); }
      setBusy(false);
      aborter = null;
      if (inputEl && isOpen) inputEl.focus({ preventScroll: true });
    }

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload, session_id: sid(), conversation_id: convId }),
      signal: aborter ? aborter.signal : undefined
    })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
        return (function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finalize(true); return; }
            buf += dec.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              var raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
              var ev = 'message', data = '';
              raw.split('\n').forEach(function (l) {
                if (l.indexOf('event:') === 0) ev = l.slice(6).trim();
                else if (l.indexOf('data:') === 0) data += l.slice(5).trim();
              });
              if (!data) continue;
              var d; try { d = JSON.parse(data); } catch (e) { continue; }
              if (ev === 'token') {
                if (first) { first = false; beginStream(); }
                acc += (d.token || '');
                renderStream(false);
              } else if (ev === 'done') {
                if (d.conversation_id) convId = d.conversation_id;
                if (first && d.reply) { first = false; beginStream(); acc = d.reply; }
                finalize(true);
                return;
              } else if (ev === 'error') {
                hideTyping();
                if (streamBub && acc) { renderStream(true); messages.push({ role: 'assistant', content: acc }); saveState(); }
                addError(d.message || 'Something went wrong.', true);
                setBusy(false); aborter = null;
                return;
              }
            }
            return pump();
          });
        })();
      })
      .catch(function (err) {
        hideTyping();
        var aborted = err && (err.name === 'AbortError');
        if (aborted) {
          // Keep whatever streamed before the stop.
          if (acc) { renderStream(true); messages.push({ role: 'assistant', content: acc }); saveState(); }
          else if (streamBub && streamBub.parentNode && streamBub.parentNode.parentNode) {
            streamBub.parentNode.parentNode.removeChild(streamBub.parentNode);
          }
          setBusy(false); aborter = null;
          return;
        }
        addError('Network error. Please try again in a moment.', true);
        setBusy(false); aborter = null;
      });
  }

  /* ---------------- Public API ---------------- */
  window.XB2BXChat = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!isOpen); },
    restart: restart,
    isOpen: function () { return isOpen; }
  };

  /* ---------------- Init ---------------- */
  loadState();
  if (started) renderChat(); else renderWelcome();

  function mount() { document.body.appendChild(host); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
