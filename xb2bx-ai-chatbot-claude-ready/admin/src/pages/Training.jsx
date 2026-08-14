import { useEffect, useState } from 'react';
import { Plus, SquarePen, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Empty, Button, Modal, Field, Badge } from '../components/ui.jsx';

const BLANK = { key: '', title: '', content: '', enabled: true };

export default function Training() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api('/admin/knowledge').then((d) => setItems(d.knowledge)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/admin/knowledge/${editing.key}`, { method: 'PUT', body: editing });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (row) => {
    await api(`/admin/knowledge/${row.key}`, { method: 'PUT', body: { ...row, enabled: !row.enabled } });
    load();
  };
  const remove = async (key) => { if (!confirm(`Delete knowledge section "${key}"?`)) return; await api(`/admin/knowledge/${key}`, { method: 'DELETE' }); load(); };
  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Edit the knowledge the assistant uses to answer. Changes apply within seconds."
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={15} strokeWidth={2.4} /> Add section</Button>}
      />
      <ErrorNote>{error}</ErrorNote>
      {!items ? <Spinner /> : items.length === 0 ? <Empty>No knowledge sections.</Empty> : (
        <div className="kb-grid">
          {items.map((k) => (
            <div key={k.key} className={`kb-card ${k.enabled ? '' : 'kb-off'}`}>
              <div className="kb-head">
                <div>
                  <strong>{k.title || k.key}</strong>
                  <div className="muted small mono">{k.key}</div>
                </div>
                {k.enabled ? <Badge tone="success">on</Badge> : <Badge>off</Badge>}
              </div>
              <p className="kb-excerpt">{(k.content || '').replace(/[#*`]/g, '').slice(0, 160)}…</p>
              <div className="kb-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...k })}><SquarePen size={14} /> Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(k)}>{k.enabled ? <><EyeOff size={14} /> Disable</> : <><Eye size={14} /> Enable</>}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(k.key)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.key ? `Edit: ${editing.key}` : 'New knowledge section'}
          onClose={() => setEditing(null)}
          wide
          footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={saving || !editing.key}><Check size={15} strokeWidth={2.4} /> {saving ? 'Saving…' : 'Save'}</Button></>}
        >
          <div className="form-grid">
            <Field label="Key (lowercase, no spaces)" hint="e.g. membership, logistics">
              <input className="input mono" value={editing.key} disabled={!!items?.find((i) => i.key === editing.key)} onChange={(e) => set('key', e.target.value.toLowerCase().replace(/\s+/g, '_'))} />
            </Field>
            <Field label="Title"><input className="input" value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Enabled">
              <label className="switch"><input type="checkbox" checked={!!editing.enabled} onChange={(e) => set('enabled', e.target.checked)} /> <span>Used by the assistant</span></label>
            </Field>
            <Field label="Content (markdown)" hint="This text is fed to the assistant as knowledge.">
              <textarea className="textarea mono" rows={14} value={editing.content} onChange={(e) => set('content', e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
