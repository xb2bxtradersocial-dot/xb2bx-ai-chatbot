/*!
 * XB2BX Assistant — embeddable widget loader.
 * Usage on any site (e.g. WordPress):
 *   <script src="https://YOUR-WIDGET-URL/embed.js" defer></script>
 * The script auto-detects its own host and loads the chat from there.
 */
(function () {
  if (window.__xb2bxWidget) return;
  window.__xb2bxWidget = true;

  // Resolve the base URL this script was served from.
  var self = document.currentScript;
  if (!self) {
    var ss = document.getElementsByTagName('script');
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].src && ss[i].src.indexOf('embed.js') > -1) { self = ss[i]; break; }
    }
  }
  var BASE = self ? self.src.replace(/\/embed\.js(\?.*)?$/, '') : '';
  var BRAND = 'rgb(255, 58, 89)';
  var Z = '2147483000';
  var open = false;

  var ICON_CHAT =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21V6a2 2 0 0 1 2-2z" fill="#fff"/>' +
    '<circle cx="9" cy="10.5" r="1.2" fill="' + BRAND + '"/><circle cx="12.5" cy="10.5" r="1.2" fill="' + BRAND + '"/><circle cx="16" cy="10.5" r="1.2" fill="' + BRAND + '"/></svg>';
  var ICON_CLOSE =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';

  // ---- Launcher button ----
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = ICON_CHAT;
  btn.style.cssText =
    'position:fixed;z-index:' + Z + ';right:20px;bottom:20px;width:62px;height:62px;border-radius:50%;' +
    'border:none;cursor:pointer;padding:0;background:' + BRAND + ';box-shadow:0 10px 28px rgba(255,58,89,0.45);' +
    'display:flex;align-items:center;justify-content:center;transition:transform .15s ease;';
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };

  // ---- Panel (iframe) ----
  var panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;z-index:' + Z + ';opacity:0;pointer-events:none;' +
    'transform:translateY(16px) scale(.98);transition:opacity .2s ease, transform .2s ease;' +
    'background:#fff;overflow:hidden;box-shadow:0 24px 60px rgba(20,20,30,0.32);';

  var iframe = document.createElement('iframe');
  iframe.title = 'XB2BX Assistant';
  iframe.src = BASE + '/?embed=1';
  iframe.allow = 'clipboard-write';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  panel.appendChild(iframe);

  function layout() {
    var mobile = window.innerWidth <= 480;
    if (mobile) {
      panel.style.right = '0'; panel.style.bottom = '0';
      panel.style.width = '100vw'; panel.style.height = '100dvh';
      panel.style.borderRadius = '0';
    } else {
      panel.style.right = '20px'; panel.style.bottom = '94px';
      panel.style.width = '400px';
      panel.style.height = 'min(640px, calc(100vh - 120px))';
      panel.style.borderRadius = '18px';
    }
  }

  function setOpen(v) {
    open = v;
    layout();
    if (open) {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.pointerEvents = 'auto';
      btn.innerHTML = ICON_CLOSE;
      btn.setAttribute('aria-label', 'Close chat');
      if (window.innerWidth <= 480) btn.style.display = 'none';
    } else {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(16px) scale(.98)';
      panel.style.pointerEvents = 'none';
      btn.innerHTML = ICON_CHAT;
      btn.setAttribute('aria-label', 'Open chat');
      btn.style.display = 'flex';
    }
  }

  btn.onclick = function () { setOpen(!open); };
  window.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'xb2bx-chat-close') setOpen(false);
  });
  window.addEventListener('resize', function () { if (open) layout(); });

  function mount() {
    layout();
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
