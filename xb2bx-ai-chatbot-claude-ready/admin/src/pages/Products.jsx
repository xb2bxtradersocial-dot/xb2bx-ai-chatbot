import { useEffect, useState } from 'react';
import { Plus, SquarePen, Trash2, Check } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty, Button, Modal, Field } from '../components/ui.jsx';

const BLANK = { title: '', category: '', description: '', keywords: '', moq: 0, price: '', supplier_id: '' };

export default function Products() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => api('/admin/products').then((d) => setItems(d.products)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api(`/admin/products/${editing.id}`, { method: 'PATCH', body: editing });
      else await api('/admin/products', { method: 'POST', body: editing });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (id) => { if (!confirm('Delete this product?')) return; await api(`/admin/products/${id}`, { method: 'DELETE' }); load(); };
  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="The catalogue the assistant can search"
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} strokeWidth={2.4} /> Add product</Button>}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <Spinner /> : items.length === 0 ? <Empty>No products.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Title</th><th>Category</th><th>MOQ</th><th>Price</th><th>Supplier</th><th></th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong><div className="muted small mono">{p.id}</div></td>
                  <td>{p.category}</td>
                  <td>{p.moq}</td>
                  <td>{p.price}</td>
                  <td className="mono small">{p.supplier_id || '—'}</td>
                  <td className="nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...p })}><SquarePen size={14} /> Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(p.id)}><Trash2 size={14} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.title}` : 'Add product'}
          onClose={() => setEditing(null)}
          footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}><Check size={15} strokeWidth={2.4} /> Save</Button></>}
        >
          <div className="form-grid">
            <Field label="Title"><input className="input" value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Category"><input className="input" value={editing.category} onChange={(e) => set('category', e.target.value)} /></Field>
            <Field label="MOQ"><input className="input" type="number" value={editing.moq} onChange={(e) => set('moq', Number(e.target.value))} /></Field>
            <Field label="Price"><input className="input" value={editing.price} onChange={(e) => set('price', e.target.value)} placeholder="e.g. from $0.18/unit" /></Field>
            <Field label="Supplier ID"><input className="input" value={editing.supplier_id || ''} onChange={(e) => set('supplier_id', e.target.value)} placeholder="SUP-1042" /></Field>
            <Field label="Keywords"><input className="input" value={editing.keywords} onChange={(e) => set('keywords', e.target.value)} /></Field>
            <Field label="Description"><textarea className="textarea" rows={3} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
