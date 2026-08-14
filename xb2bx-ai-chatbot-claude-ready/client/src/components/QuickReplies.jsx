import { CONFIG } from '../config.js';

export default function QuickReplies({ onPick, disabled }) {
  return (
    <div className="quick-replies">
      {CONFIG.quickReplies.map((q) => (
        <button
          key={q.label}
          className="quick-reply"
          disabled={disabled}
          onClick={() => onPick(q.text)}
        >
          <span className="quick-emoji">{q.icon}</span>
          <span>{q.label}</span>
        </button>
      ))}
    </div>
  );
}
