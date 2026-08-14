import { useEffect, useRef } from 'react';
import Message from './Message.jsx';
import QuickReplies from './QuickReplies.jsx';
import TypingIndicator from './TypingIndicator.jsx';

export default function MessageList({ messages, loading, showQuickReplies, onQuickPick }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="messages">
      {messages.map((m, i) => (
        <Message key={i} role={m.role} content={m.content} />
      ))}

      {showQuickReplies && <QuickReplies onPick={onQuickPick} disabled={loading} />}

      {loading && <TypingIndicator />}

      <div ref={endRef} />
    </div>
  );
}
