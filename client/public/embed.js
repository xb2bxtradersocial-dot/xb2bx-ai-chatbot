/*!
 * XB2BX Assistant — embeddable widget loader (v2).
 * Usage on any site (e.g. WordPress):
 *   <script src="https://YOUR-WIDGET-URL/embed.js" defer></script>
 * The script auto-detects its own host and loads the chat from there.
 *
 * v2 highlights:
 *  - XB2BX house treatment: navy #07111f base, cyan #27e0e0 accent, gold #c8a84b detail
 *  - Shadow DOM isolation (open) — zero CSS bleed in/out of host CMS pages
 *  - Lazy iframe load (nothing heavy until first open)
 *  - Springy open/close motion, launcher morph, ambient cyan pulse
 *  - Greeting bubble (once per session), unread badge via postMessage
 *  - Escape-to-close, role="dialog", focus return, prefers-reduced-motion respected
 *  - iOS safe-area insets, mobile full-screen with backdrop
 *  - Origin-checked postMessage + public API: window.XB2BXWidget.open/close/toggle
 */
(function () {
  'use strict';
  if (window.__xb2bxWidget) return;
  window.__xb2bxWidget = true;

  /* ---------- Resolve base URL this script was served from ---------- */
  var self = document.currentScript;
  if (!self) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].src && ss[i].src.indexOf('embed.js') > -1) { self = ss[i]; break; }
    }
  }
  var BASE = self ? self.src.replace(/\/embed\.js(\?.*)?$/, '') : '';
  if (!BASE) {
    // Fail gracefully rather than iframing the host site's homepage.
    if (window.console && console.warn) console.warn('[XB2BX Assistant] Could not resolve widget base URL — widget not mounted.');
    return;
  }
  var WIDGET_ORIGIN = (function () {
    try { return new URL(BASE).origin; } catch (e) { return ''; }
  })();

  /* ---------- Design tokens (XB2BX house system) ---------- */
  var NAVY = '#07111f';
  var NAVY_2 = '#0b1a30';
  var CYAN = '#27e0e0';
  var GOLD = '#c8a84b';
  var Z = 2147483000;

  /* ---------- Host + Shadow root ---------- */
  var host = document.createElement('div');
  host.id = 'xb2bx-assistant-root';
  var root = host.attachShadow({ mode: 'open' });

  /* ---------- Styles (fully encapsulated) ---------- */
  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',

    /* Launcher */
    '.xb-launch{position:fixed;z-index:' + Z + ';right:max(20px, env(safe-area-inset-right, 0px));',
    '  bottom:max(20px, env(safe-area-inset-bottom, 0px));width:62px;height:62px;border-radius:50%;',
    '  border:1px solid rgba(39,224,224,.35);cursor:pointer;padding:0;',
    '  background:radial-gradient(120% 120% at 30% 25%, ' + NAVY_2 + ' 0%, ' + NAVY + ' 62%);',
    '  box-shadow:0 10px 30px rgba(7,17,31,.45), 0 0 0 0 rgba(39,224,224,.45);',
    '  display:flex;align-items:center;justify-content:center;',
    '  transition:transform .18s cubic-bezier(.2,.9,.3,1.4), box-shadow .25s ease, border-color .25s ease;',
    '  -webkit-tap-highlight-color:transparent;font:inherit}',
    '.xb-launch:hover{transform:translateY(-2px) scale(1.05);border-color:rgba(39,224,224,.8);',
    '  box-shadow:0 14px 34px rgba(7,17,31,.5), 0 0 22px rgba(39,224,224,.35)}',
    '.xb-launch:focus-visible{outline:2px solid ' + CYAN + ';outline-offset:3px}',
    '.xb-launch:active{transform:scale(.96)}',

    /* Ambient attention pulse (until first open) */
    '@keyframes xb-pulse{0%{box-shadow:0 10px 30px rgba(7,17,31,.45), 0 0 0 0 rgba(39,224,224,.40)}',
    '  70%{box-shadow:0 10px 30px rgba(7,17,31,.45), 0 0 0 14px rgba(39,224,224,0)}',
    '  100%{box-shadow:0 10px 30px rgba(7,17,31,.45), 0 0 0 0 rgba(39,224,224,0)}}',
    '.xb-launch.xb-pulse{animation:xb-pulse 2.6s ease-out infinite}',

    /* Icon morph: two icons stacked, cross-fade + rotate */
    '.xb-ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
    '  transition:opacity .18s ease, transform .22s cubic-bezier(.2,.9,.3,1.3)}',
    '.xb-ic-close{opacity:0;transform:rotate(-90deg) scale(.6)}',
    '.xb-launch.xb-on .xb-ic-chat{opacity:0;transform:rotate(90deg) scale(.6)}',
    '.xb-launch.xb-on .xb-ic-close{opacity:1;transform:rotate(0) scale(1)}',

    /* Unread badge */
    '.xb-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 6px;',
    '  border-radius:11px;background:' + GOLD + ';color:' + NAVY + ';font:700 12px/22px ui-sans-serif,system-ui,sans-serif;',
    '  text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);display:none}',
    '.xb-badge.xb-show{display:block;animation:xb-pop .3s cubic-bezier(.2,.9,.3,1.5)}',
    '@keyframes xb-pop{from{transform:scale(.4)}to{transform:scale(1)}}',

    /* Greeting bubble */
    '.xb-greet{position:fixed;z-index:' + Z + ';right:max(20px, env(safe-area-inset-right,0px));',
    '  bottom:calc(max(20px, env(safe-area-inset-bottom,0px)) + 74px);max-width:250px;',
    '  background:' + NAVY + ';color:#eaf6f6;border:1px solid rgba(39,224,224,.35);border-radius:14px 14px 4px 14px;',
    '  padding:12px 34px 12px 14px;font:500 13.5px/1.45 ui-sans-serif,system-ui,sans-serif;',
    '  box-shadow:0 12px 32px rgba(7,17,31,.4);opacity:0;transform:translateY(8px);pointer-events:none;',
    '  transition:opacity .25s ease, transform .25s ease}',
    '.xb-greet.xb-show{opacity:1;transform:translateY(0);pointer-events:auto}',
    '.xb-greet b{color:' + CYAN + ';font-weight:700}',
    '.xb-greet-x{position:absolute;top:6px;right:6px;width:22px;height:22px;border:none;border-radius:50%;',
    '  background:transparent;color:#9fb3c8;cursor:pointer;font:700 13px/22px ui-sans-serif,system-ui,sans-serif}',
    '.xb-greet-x:hover{color:#fff;background:rgba(255,255,255,.08)}',

    /* Panel */
    '.xb-panel{position:fixed;z-index:' + Z + ';right:20px;bottom:94px;width:400px;',
    '  height:min(660px, calc(100vh - 120px));border-radius:18px;overflow:hidden;',
    '  background:' + NAVY + ';border:1px solid rgba(39,224,224,.28);',
    '  box-shadow:0 24px 64px rgba(7,17,31,.5), 0 0 0 1px rgba(255,255,255,.03) inset;',
    '  opacity:0;pointer-events:none;transform:translateY(18px) scale(.97);transform-origin:bottom right;',
    '  transition:opacity .22s ease, transform .26s cubic-bezier(.2,.9,.3,1.25);display:flex;flex-direction:column}',
    '.xb-panel.xb-on{opacity:1;pointer-events:auto;transform:translateY(0) scale(1)}',

    /* Panel header (brand bar above the iframe) */
    '.xb-head{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:12px 14px;',
    '  background:linear-gradient(180deg, ' + NAVY_2 + ' 0%, ' + NAVY + ' 100%);',
    '  border-bottom:1px solid rgba(39,224,224,.18)}',
    '.xb-dot{width:9px;height:9px;border-radius:50%;background:' + CYAN + ';box-shadow:0 0 10px rgba(39,224,224,.8);flex:0 0 auto}',
    '.xb-title{color:#eaf6f6;font:700 14px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em}',
    '.xb-sub{color:#8fa6bb;font:500 11.5px/1 ui-sans-serif,system-ui,sans-serif;margin-top:3px}',
    '.xb-head-x{margin-left:auto;width:30px;height:30px;border:none;border-radius:8px;background:transparent;',
    '  color:#9fb3c8;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s ease,color .15s ease}',
    '.xb-head-x:hover{background:rgba(255,255,255,.07);color:#fff}',
    '.xb-head-x:focus-visible{outline:2px solid ' + CYAN + ';outline-offset:2px}',

    /* Iframe area + loading shimmer */
    '.xb-body{position:relative;flex:1 1 auto;background:#fff}',
    '.xb-frame{position:absolute;inset:0;width:100%;height:100%;border:none;display:block}',
    '.xb-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:' + NAVY + ';',
    '  transition:opacity .3s ease}',
    '.xb-load.xb-off{opacity:0;pointer-events:none}',
    '.xb-spin{width:34px;height:34px;border-radius:50%;border:3px solid rgba(39,224,224,.2);border-top-color:' + CYAN + ';',
    '  animation:xb-rot .8s linear infinite}',
    '@keyframes xb-rot{to{transform:rotate(360deg)}}',

    /* Mobile: full screen + backdrop */
    '.xb-back{position:fixed;inset:0;z-index:' + (Z - 1) + ';background:rgba(7,17,31,.55);',
    '  backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .2s ease}',
    '.xb-back.xb-on{opacity:1;pointer-events:auto}',
    '@media (max-width:480px){',
    '  .xb-panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0;border:none;transform:translateY(24px)}',
    '  .xb-panel.xb-on{transform:translateY(0)}',
    '  .xb-greet{max-width:210px}',
    '}',

    /* Reduced motion */
    '@media (prefers-reduced-motion:reduce){',
    '  .xb-launch,.xb-panel,.xb-ic,.xb-greet,.xb-back{transition:none !important}',
    '  .xb-launch.xb-pulse{animation:none}',
    '  .xb-badge.xb-show{animation:none}',
    '}'
  ].join('\n');

  /* ---------- SVG icons (navy/cyan treatment) ---------- */
  var ICON_CHAT =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21V6a2 2 0 0 1 2-2z" fill="' + CYAN + '"/>' +
    '<circle cx="9" cy="10.5" r="1.2" fill="' + NAVY + '"/>' +
    '<circle cx="12.5" cy="10.5" r="1.2" fill="' + NAVY + '"/>' +
    '<circle cx="16" cy="10.5" r="1.2" fill="' + NAVY + '"/></svg>';
  var ICON_CLOSE =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="' + CYAN + '" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var ICON_X_SMALL =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

  /* ---------- DOM ---------- */
  var launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'xb-launch xb-pulse';
  launch.setAttribute('aria-label', 'Open XB2BX Assistant');
  launch.setAttribute('aria-expanded', 'false');
  launch.innerHTML =
    '<span class="xb-ic xb-ic-chat">' + ICON_CHAT + '</span>' +
    '<span class="xb-ic xb-ic-close">' + ICON_CLOSE + '</span>' +
    '<span class="xb-badge" aria-hidden="true"></span>';

  var greet = document.createElement('div');
  greet.className = 'xb-greet';
  greet.setAttribute('role', 'status');
  greet.innerHTML =
    'Hi — I\u2019m the <b>XB2BX Assistant</b>. Ask me about sourcing, suppliers or trade support.' +
    '<button type="button" class="xb-greet-x" aria-label="Dismiss">' + ICON_X_SMALL + '</button>';

  var back = document.createElement('div');
  back.className = 'xb-back';

  var panel = document.createElement('div');
  panel.className = 'xb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-label', 'XB2BX Assistant chat');
  panel.innerHTML =
    '<div class="xb-head">' +
    '  <span class="xb-dot"></span>' +
    '  <div><div class="xb-title">XB2BX Assistant</div><div class="xb-sub">Typically replies in seconds</div></div>' +
    '  <button type="button" class="xb-head-x" aria-label="Close chat">' + ICON_X_SMALL + '</button>' +
    '</div>' +
    '<div class="xb-body">' +
    '  <div class="xb-load"><div class="xb-spin" aria-hidden="true"></div></div>' +
    '</div>';

  root.appendChild(style);
  root.appendChild(back);
  root.appendChild(panel);
  root.appendChild(greet);
  root.appendChild(launch);

  var badge = launch.querySelector('.xb-badge');
  var body = panel.querySelector('.xb-body');
  var loader = panel.querySelector('.xb-load');
  var iframe = null;

  /* ---------- State ---------- */
  var open = false;
  var everOpened = false;
  var lastFocus = null;

  function ensureFrame() {
    if (iframe) return;
    iframe = document.createElement('iframe');
    iframe.className = 'xb-frame';
    iframe.title = 'XB2BX Assistant';
    iframe.src = BASE + '/?embed=1';
    iframe.allow = 'clipboard-write';
    iframe.addEventListener('load', function () { loader.classList.add('xb-off'); });
    body.appendChild(iframe);
  }

  function isMobile() { return window.innerWidth <= 480; }

  function setOpen(v) {
    if (v === open) return;
    open = v;
    if (open) {
      everOpened = true;
      lastFocus = document.activeElement;
      ensureFrame();
      hideGreet();
      clearBadge();
      launch.classList.remove('xb-pulse');
      launch.classList.add('xb-on');
      launch.setAttribute('aria-label', 'Close XB2BX Assistant');
      launch.setAttribute('aria-expanded', 'true');
      panel.classList.add('xb-on');
      panel.setAttribute('aria-modal', isMobile() ? 'true' : 'false');
      if (isMobile()) back.classList.add('xb-on');
      var closeBtn = panel.querySelector('.xb-head-x');
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    } else {
      launch.classList.remove('xb-on');
      launch.setAttribute('aria-label', 'Open XB2BX Assistant');
      launch.setAttribute('aria-expanded', 'false');
      panel.classList.remove('xb-on');
      back.classList.remove('xb-on');
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
      else launch.focus({ preventScroll: true });
    }
  }

  /* ---------- Greeting (once per session) ---------- */
  var GREET_KEY = 'xb2bx-greet-dismissed';
  function greetDismissed() {
    try { return sessionStorage.getItem(GREET_KEY) === '1'; } catch (e) { return false; }
  }
  function hideGreet(persist) {
    greet.classList.remove('xb-show');
    if (persist !== false) { try { sessionStorage.setItem(GREET_KEY, '1'); } catch (e) {} }
  }
  if (!greetDismissed()) {
    setTimeout(function () { if (!open) greet.classList.add('xb-show'); }, 3500);
    setTimeout(function () { hideGreet(false); }, 18000);
  }
  greet.querySelector('.xb-greet-x').addEventListener('click', function (e) {
    e.stopPropagation(); hideGreet();
  });
  greet.addEventListener('click', function () { setOpen(true); });

  /* ---------- Badge ---------- */
  function setBadge(n) {
    n = parseInt(n, 10) || 0;
    if (n > 0 && !open) {
      badge.textContent = n > 9 ? '9+' : String(n);
      badge.classList.add('xb-show');
      if (!everOpened) launch.classList.add('xb-pulse');
    } else clearBadge();
  }
  function clearBadge() { badge.classList.remove('xb-show'); }

  /* ---------- Events ---------- */
  launch.addEventListener('click', function () { setOpen(!open); });
  back.addEventListener('click', function () { setOpen(false); });
  panel.querySelector('.xb-head-x').addEventListener('click', function () { setOpen(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) setOpen(false);
  });

  window.addEventListener('message', function (e) {
    if (WIDGET_ORIGIN && e.origin !== WIDGET_ORIGIN) return;
    var d = e && e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'xb2bx-chat-close') setOpen(false);
    else if (d.type === 'xb2bx-chat-open') setOpen(true);
    else if (d.type === 'xb2bx-chat-badge') setBadge(d.count);
  });

  /* ---------- Public API ---------- */
  window.XB2BXWidget = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!open); },
    isOpen: function () { return open; }
  };

  /* ---------- Mount ---------- */
  function mount() { document.body.appendChild(host); }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
