import { useState } from 'react';
import { SendIcon } from '../icons.jsx';

export default function Composer({ onSend, disabled }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  return (
    <form className="composer" onSubmit={submit}>
      <input
        className="composer-input"
        type="text"
        placeholder="Write your message…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        autoComplete="off"
      />
      <button className="composer-send" type="submit" disabled={disabled || !value.trim()} aria-label="Send">
        <SendIcon />
      </button>
    </form>
  );
}
