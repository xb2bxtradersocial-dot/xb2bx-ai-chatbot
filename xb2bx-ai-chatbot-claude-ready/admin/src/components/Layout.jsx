import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessagesSquare,
  Target,
  Factory,
  Package,
  FileText,
  LifeBuoy,
  BrainCircuit,
  Settings,
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { clearToken } from '../auth.js';
import { CONFIG } from '../config.js';

const NAV = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/conversations', label: 'Conversations', Icon: MessagesSquare },
  { to: '/leads', label: 'Leads', Icon: Target },
  { to: '/suppliers', label: 'Suppliers', Icon: Factory },
  { to: '/products', label: 'Products', Icon: Package },
  { to: '/rfqs', label: 'RFQs', Icon: FileText },
  { to: '/tickets', label: 'Tickets & Handoffs', Icon: LifeBuoy },
  { to: '/training', label: 'Training', Icon: BrainCircuit },
  { to: '/accounts', label: 'Accounts', Icon: Users },
  { to: '/settings', label: 'Settings', Icon: Settings }
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Mobile top bar (hidden on desktop) */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={22} strokeWidth={2} />
        </button>
        <span className="topbar-brand">
          <img className="logo-img topbar-logo" src="/logo.png" alt="XB2BX" />
          {CONFIG.brand} Admin
        </span>
      </header>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-badge">
            <img className="logo-img" src="/logo.png" alt="XB2BX" />
          </span>
          <div className="brand-text">
            <div className="brand-name">{CONFIG.brand}</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <nav className="nav">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">
                <Icon size={18} strokeWidth={2} />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          <LogOut size={16} strokeWidth={2} /> Log out
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
