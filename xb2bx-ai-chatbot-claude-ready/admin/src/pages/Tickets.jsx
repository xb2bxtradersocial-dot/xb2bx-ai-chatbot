import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty, Badge } from '../components/ui.jsx';

const TICKET_STATUS = ['open', 'pending', 'resolved'];
const ESC_STATUS = ['queued', 'handled'];
const PRIO_TONE = { high: 'danger', normal: 'accent', low: 'neutral' };

export default function Tickets() {
  const [tickets, setTickets] = useState(null);
  const [escalations, setEscalations] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/admin/tickets').then((d) => setTickets(d.tickets)).catch((e) => setError(e.message));
    api('/admin/escalations').then((d) => setEscalations(d.escalations)).catch((e) => setError(e.message));
  };
  useEffect(() => { load(); }, []);

  const upd = async (kind, id, status) => { await api(`/admin/${kind}/${id}`, { method: 'PATCH', body: { status } }); load(); };
  const del = async (kind, id) => { if (!confirm('Delete this item?')) return; await api(`/admin/${kind}/${id}`, { method: 'DELETE' }); load(); };

  return (
    <div>
      <PageHeader title="Tickets & Handoffs" subtitle="Support tickets and human-handoff escalations" />
      <ErrorNote>{error}</ErrorNote>

      <h3 className="section-title">Support tickets</h3>
      {!tickets ? <Spinner /> : tickets.length === 0 ? <Empty>No tickets.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Subject</th><th>Priority</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="mono small">{t.id}</td>
                  <td><strong>{t.subject}</strong><div className="muted small truncate">{t.description}</div></td>
                  <td><Badge tone={PRIO_TONE[t.priority]}>{t.priority}</Badge></td>
                  <td className="small">{t.contact_email || '—'}</td>
                  <td>
                    <select className="select" value={t.status} onChange={(e) => upd('tickets', t.id, e.target.value)}>
                      {TICKET_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => del('tickets', t.id)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="section-title">Escalations (human handoff)</h3>
      {!escalations ? <Spinner /> : escalations.length === 0 ? <Empty>No escalations.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Reason</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {escalations.map((e) => (
                <tr key={e.id}>
                  <td className="mono small">{e.id}</td>
                  <td className="truncate">{e.reason}</td>
                  <td className="small">{e.contact_email || e.contact_phone || '—'}</td>
                  <td>
                    <select className="select" value={e.status} onChange={(ev) => upd('escalations', e.id, ev.target.value)}>
                      {ESC_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => del('escalations', e.id)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
