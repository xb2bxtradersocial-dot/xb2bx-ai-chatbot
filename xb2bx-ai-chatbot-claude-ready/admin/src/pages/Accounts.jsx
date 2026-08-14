import { useEffect, useState } from 'react';
import { Plus, SquarePen, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';
import { getUser, setUser } from '../auth.js';
import { PageHeader, Spinner, ErrorNote, Empty, Button, Modal, Field, Badge } from '../components/ui.jsx';

const BLANK = { email: '', password: '', role: 'member' };

export default function Accounts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [reveal, setReveal] = useState({}); // id -> bool
  const me = getUser();

  const load = () =>
    api('/admin/accounts')
      .then((d) => setItems(d.accounts))
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    try {
      if (editing.id) {
        const { account } = await api(`/admin/accounts/${editing.id}`, { method: 'PATCH', body: { email: editing.email, password: editing.password, role: editing.role } });
        // If I edited my own account, keep the stored session in sync.
        if (me && account && me.email === (editing._originalEmail || '').toLowerCase()) setUser({ email: account.email, role: account.role });
      } else {
        await api('/admin/accounts', { method: 'POST', body: editing });
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete the account "${row.email}"? They will lose access to the admin panel.`)) return;
    setError('');
    try {
      await api(`/admin/accounts/${row.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const isMe = (row) => me && me.email && row.email === me.email;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Create and manage admin panel logins for your team"
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} strokeWidth={2.4} /> Add account</Button>}
      />
      <ErrorNote>{error}</ErrorNote>

      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No accounts yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Email</th><th>Password</th><th>Role</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.email}</strong>
                    {isMe(a) && <Badge tone="accent">You</Badge>}
                  </td>
                  <td>
                    <span className="mono">{reveal[a.id] ? a.password : '••••••••'}</span>
                    <button
                      className="icon-btn"
                      title={reveal[a.id] ? 'Hide' : 'Show'}
                      onClick={() => setReveal((r) => ({ ...r, [a.id]: !r[a.id] }))}
                    >
                      {reveal[a.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </td>
                  <td>{a.role === 'owner' ? <Badge tone="success">owner</Badge> : <Badge>member</Badge>}</td>
                  <td className="muted small">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  <td className="nowrap">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditing({ ...a, _originalEmail: a.email })}
                    >
                      <SquarePen size={14} /> Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(a)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? (isMe(editing) ? 'Edit your account' : `Edit ${editing.email}`) : 'Add account'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={!editing.email || !editing.password}>
                <Check size={15} strokeWidth={2.4} /> Save
              </Button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Email">
              <input className="input" type="email" value={editing.email} onChange={(e) => set('email', e.target.value)} placeholder="employee@company.com" />
            </Field>
            <Field label="Password" hint="The user signs in with this password.">
              <input className="input" type="text" value={editing.password} onChange={(e) => set('password', e.target.value)} placeholder="Set a password" />
            </Field>
            <Field label="Role">
              <select className="select" value={editing.role} onChange={(e) => set('role', e.target.value)}>
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
