import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../api.js';
import { PageHeader, Spinner, ErrorNote, Button, Field } from '../components/ui.jsx';

export default function Settings() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');

  const load = () =>
    api('/admin/settings')
      .then((d) => setS(d.settings))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError('');

    try {
      const patch = {
        bot_enabled: s.bot_enabled,
        anthropic_model: s.anthropic_model,
        anthropic_router_model: s.anthropic_router_model,
        temperature: s.temperature,
        max_tokens: s.max_tokens,
        persona_extra: s.persona_extra,
        company_name: s.company_name,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
        contact_hours: s.contact_hours
      };

      if (newKey.trim()) {
        patch.anthropic_api_key = newKey.trim();
      }

      const { settings } = await api('/admin/settings', {
        method: 'PUT',
        body: patch
      });

      setS(settings);
      setNewKey('');
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!s) {
    return (
      <div>
        <PageHeader title="Settings" />
        <ErrorNote>{error}</ErrorNote>
        {!error && <Spinner />}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Control the chatbot: Claude model, persona, contact info, and on/off"
      />

      <ErrorNote>{error}</ErrorNote>

      {saved && (
        <div className="success-note">
          ✅ Settings saved.
        </div>
      )}

      <div className="settings-cards">
        <section className="card">
          <h3 className="section-title">Chatbot</h3>

          <Field label="Status">
            <label className="switch">
              <input
                type="checkbox"
                checked={s.bot_enabled !== 'false'}
                onChange={(e) =>
                  set(
                    'bot_enabled',
                    e.target.checked ? 'true' : 'false'
                  )
                }
              />
              <span>
                {s.bot_enabled !== 'false'
                  ? 'Online — answering users'
                  : 'Offline — showing maintenance message'}
              </span>
            </label>
          </Field>

          <Field label="Company name">
            <input
              className="input"
              value={s.company_name || ''}
              onChange={(e) =>
                set('company_name', e.target.value)
              }
            />
          </Field>

          <Field
            label="Persona / extra instructions"
            hint="Appended to every system prompt. Tune tone or rules here."
          >
            <textarea
              className="textarea"
              rows={4}
              value={s.persona_extra || ''}
              onChange={(e) =>
                set('persona_extra', e.target.value)
              }
            />
          </Field>
        </section>

        <section className="card">
          <h3 className="section-title">Anthropic / Claude</h3>

          <Field
            label="API key"
            hint={
              s.anthropic_api_key_set
                ? `Current: ${s.anthropic_api_key} — type a new key to replace it.`
                : 'No key set yet — paste your Anthropic API key.'
            }
          >
            <input
              className="input mono"
              type="password"
              placeholder={
                s.anthropic_api_key_set
                  ? '•••••••••• (unchanged)'
                  : 'sk-ant-…'
              }
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </Field>

          <Field label="Main model">
            <input
              className="input"
              value={s.anthropic_model || ''}
              onChange={(e) =>
                set('anthropic_model', e.target.value)
              }
              placeholder="claude-sonnet-4-20250514"
            />
          </Field>

          <Field label="Router model">
            <input
              className="input"
              value={s.anthropic_router_model || ''}
              onChange={(e) =>
                set('anthropic_router_model', e.target.value)
              }
              placeholder="claude-sonnet-4-20250514"
            />
          </Field>

          <div className="row-2">
            <Field label="Temperature">
              <input
                className="input"
                type="number"
                step="0.1"
                value={s.temperature || ''}
                onChange={(e) =>
                  set('temperature', e.target.value)
                }
              />
            </Field>

            <Field label="Max tokens">
              <input
                className="input"
                type="number"
                value={s.max_tokens || ''}
                onChange={(e) =>
                  set('max_tokens', e.target.value)
                }
              />
            </Field>
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">Contact info</h3>

          <Field label="Support email">
            <input
              className="input"
              value={s.contact_email || ''}
              onChange={(e) =>
                set('contact_email', e.target.value)
              }
            />
          </Field>

          <Field label="Support phone">
            <input
              className="input"
              value={s.contact_phone || ''}
              onChange={(e) =>
                set('contact_phone', e.target.value)
              }
            />
          </Field>

          <Field label="Support hours">
            <input
              className="input"
              value={s.contact_hours || ''}
              onChange={(e) =>
                set('contact_hours', e.target.value)
              }
              placeholder="Mon–Fri 9am–6pm GMT"
            />
          </Field>
        </section>
      </div>

      <div className="settings-save">
        <Button onClick={save} disabled={saving}>
          <Check size={15} strokeWidth={2.4} />
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
