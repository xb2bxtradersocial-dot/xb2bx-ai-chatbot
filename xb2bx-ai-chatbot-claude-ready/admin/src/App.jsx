import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './auth.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Conversations from './pages/Conversations.jsx';
import Leads from './pages/Leads.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Products from './pages/Products.jsx';
import Rfqs from './pages/Rfqs.jsx';
import Tickets from './pages/Tickets.jsx';
import Training from './pages/Training.jsx';
import Settings from './pages/Settings.jsx';
import Accounts from './pages/Accounts.jsx';

function Protected({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="leads" element={<Leads />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="products" element={<Products />} />
          <Route path="rfqs" element={<Rfqs />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="training" element={<Training />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
