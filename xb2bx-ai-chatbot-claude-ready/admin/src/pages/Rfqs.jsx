import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty } from '../components/ui.jsx';

const STATUSES = ['created', 'sent', 'quoted', 'closed'];

export default function Rfqs() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/admin/rfqs').then((d) => setItems(d.rfqs)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => { await api(`/admin/rfqs/${id}`, { method: 'PATCH', body: { status } }); load(); };
  const remove = async (id) => { if (!confirm('Delete this RFQ?')) return; await api(`/admin/rfqs/${id}`, { method: 'DELETE' }); load(); };

  return (
    <div>
      <PageHeader title="RFQs" subtitle="Requests for quote created by buyers" />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <Spinner /> : items.length === 0 ? <Empty>No RFQs yet.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Product</th><th>Qty</th><th>Country</th><th>Timeline</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="mono small">{r.id}</td>
                  <td><strong>{r.product}</strong></td>
                  <td>{r.quantity}</td>
                  <td>{r.target_country || '—'}</td>
                  <td>{r.delivery_timeline || '—'}</td>
                  <td className="small">{r.contact_email || '—'}</td>
                  <td>
                    <select className="select" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => remove(r.id)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
