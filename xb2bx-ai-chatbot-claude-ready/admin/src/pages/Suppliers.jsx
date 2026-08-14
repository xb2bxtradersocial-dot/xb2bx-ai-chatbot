import { useEffect, useState } from 'react';
import { Plus, SquarePen, Trash2, Check } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty, Button, Modal, Field, Badge } from '../components/ui.jsx';

const BLANK = {
  name: '', country: '', categories: '', keywords: '', description: '',
  monthly_capacity: 0, min_order_qty: 0, verified: true, responsiveness: 0.8, rating: 4.5
};

export default function Suppliers() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // {…row} or BLANK for new

  const load = () => api('/admin/suppliers').then((d) => setItems(d.suppliers)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api(`/admin/suppliers/${editing.id}`, { method: 'PATCH', body: editing });
      else await api('/admin/suppliers', { method: 'POST', body: editing });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (id) => { if (!confirm('Delete this supplier?')) return; await api(`/admin/suppliers/${id}`, { method: 'DELETE' }); load(); };

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="The verified supplier directory the assistant searches"
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} strokeWidth={2.4} /> Add supplier</Button>}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <Spinner /> : items.length === 0 ? <Empty>No suppliers.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Country</th><th>Categories</th><th>Capacity</th><th>Verified</th><th>Rating</th><th></th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong><div className="muted small mono">{s.id}</div></td>
                  <td>{s.country}</td>
                  <td className="small">{s.categories}</td>
                  <td>{Number(s.monthly_capacity).toLocaleString()}</td>
                  <td>{s.verified ? <Badge tone="success">verified</Badge> : <Badge>no</Badge>}</td>
                  <td>{s.rating}</td>
                  <td className="nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...s, verified: !!s.verified })}><SquarePen size={14} /> Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(s.id)}><Trash2 size={14} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name}` : 'Add supplier'}
          onClose={() => setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}><Check size={15} strokeWidth={2.4} /> Save</Button></>}
        >
          <div className="form-grid">
            <Field label="Name"><input className="input" value={editing.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Country"><input className="input" value={editing.country} onChange={(e) => set('country', e.target.value)} /></Field>
            <Field label="Categories (comma-separated)"><input className="input" value={editing.categories} onChange={(e) => set('categories', e.target.value)} /></Field>
            <Field label="Keywords"><input className="input" value={editing.keywords} onChange={(e) => set('keywords', e.target.value)} /></Field>
            <Field label="Monthly capacity"><input className="input" type="number" value={editing.monthly_capacity} onChange={(e) => set('monthly_capacity', Number(e.target.value))} /></Field>
            <Field label="Min order qty"><input className="input" type="number" value={editing.min_order_qty} onChange={(e) => set('min_order_qty', Number(e.target.value))} /></Field>
            <Field label="Responsiveness (0–1)"><input className="input" type="number" step="0.01" value={editing.responsiveness} onChange={(e) => set('responsiveness', Number(e.target.value))} /></Field>
            <Field label="Rating (0–5)"><input className="input" type="number" step="0.1" value={editing.rating} onChange={(e) => set('rating', Number(e.target.value))} /></Field>
            <Field label="Verified">
              <label className="switch"><input type="checkbox" checked={!!editing.verified} onChange={(e) => set('verified', e.target.checked)} /> <span>Verified supplier</span></label>
            </Field>
            <Field label="Description"><textarea className="textarea" rows={3} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
