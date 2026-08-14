import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty, Modal, Badge } from '../components/ui.jsx';

export default function Conversations() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);

  const load = () => api('/admin/conversations').then((d) => setItems(d.conversations)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const open = async (id) => {
    try {
      const { conversation } = await api(`/admin/conversations/${id}`);
      setActive(conversation);
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation and its messages?')) return;
    await api(`/admin/conversations/${id}`, { method: 'DELETE' });
    setActive(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Conversations" subtitle="Full chat history with the assistant" />
      <ErrorNote>{error}</ErrorNote>
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No conversations yet.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Last agent</th><th>Messages</th><th>Last message</th><th>Updated</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="row-click" onClick={() => open(c.id)}>
                  <td className="mono small">{c.id}</td>
                  <td>{c.agent ? <Badge tone="accent">{c.agent}</Badge> : '—'}</td>
                  <td>{c.message_count}</td>
                  <td className="truncate">{c.last_message}</td>
                  <td className="muted small">{new Date(c.updated_at).toLocaleString()}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={(e) => remove(c.id, e)}><Trash2 size={14} /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <Modal title={`Conversation ${active.id}`} onClose={() => setActive(null)} wide>
          <div className="chat-log">
            {active.messages.map((m) => (
              <div key={m.id} className={`log-msg log-${m.role}`}>
                <div className="log-role">{m.role === 'user' ? 'User' : m.agent || 'Assistant'}</div>
                <div className="log-content">{m.content}</div>
                <div className="log-time">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
