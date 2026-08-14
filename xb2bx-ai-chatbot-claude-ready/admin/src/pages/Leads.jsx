import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Badge, Empty } from '../components/ui.jsx';

const TIER_TONE = { hot: 'danger', warm: 'warn', cold: 'neutral' };
const STATUSES = ['new', 'contacted', 'converted', 'lost'];

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/admin/leads').then((d) => setLeads(d.leads)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    await api(`/admin/leads/${id}`, { method: 'PATCH', body: { status } });
    load();
  };
  const remove = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await api(`/admin/leads/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Leads" subtitle="Captured and scored by the assistant" />
      <ErrorNote>{error}</ErrorNote>
      {!leads ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <Empty>No leads captured yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Interest</th><th>Contact</th><th>Score</th><th>Tier</th>
                <th>Budget</th><th>Volume</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.interest || '—'}</strong><div className="muted small">{l.location}</div></td>
                  <td>{l.name || '—'}<div className="muted small">{l.email}</div></td>
                  <td>{l.score}</td>
                  <td><Badge tone={TIER_TONE[l.tier]}>{l.tier}</Badge></td>
                  <td>{l.budget || '—'}</td>
                  <td>{l.volume || '—'}</td>
                  <td>
                    <select className="select" value={l.status} onChange={(e) => setStatus(l.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => remove(l.id)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
