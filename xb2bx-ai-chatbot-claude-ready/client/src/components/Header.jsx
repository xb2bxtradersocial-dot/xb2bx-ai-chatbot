import { CONFIG } from '../config.js';
import { CloseIcon } from '../icons.jsx';

export default function Header({ onClose }) {
  return (
    <header className="header">
      <div className="header-avatar">
        <img className="logo-img" src="/logo.png" alt="XB2BX" />
        <span className="online-dot" />
      </div>

      <div className="header-titles">
        <h2 className="header-title">{CONFIG.title}</h2>
        <p className="header-tagline">{CONFIG.tagline}</p>
      </div>

      <div className="header-right">
        <span className="header-private">{CONFIG.privacyLabel}</span>
        <button className="header-close" onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}
