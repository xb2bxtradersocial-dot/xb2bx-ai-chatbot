import { useState, useCallback } from 'react';
import { CONFIG, EMBED } from './config.js';
import { streamMessage, getSessionId } from './api.js';
import Header from './components/Header.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import MessageList from './components/MessageList.jsx';
import Composer from './components/Composer.jsx';

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // true until first token arrives
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const start = () => {
    setStarted(true);
    setMessages([{ role: 'assistant', content: CONFIG.greeting }]);
  };

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setConversationId(null);
    setLoading(false);
    setStreaming(false);
  };

  // In embedded mode the X collapses the floating widget (keeps the chat);
  // standalone it resets the conversation.
  const handleClose = () => {
    if (EMBED) window.parent.postMessage({ type: 'xb2bx-chat-close' }, '*');
    else reset();
  };

  const send = useCallback(
    async (text) => {
      if (!text || loading || streaming) return;

      const history = [...messages, { role: 'user', content: text }];
      setMessages(history);
      setLoading(true);

      // Backend payload: skip the static greeting (index 0 assistant).
      const payload = history.filter((m, i) => !(i === 0 && m.role === 'assistant'));

      let firstToken = true;
      await streamMessage({
        messages: payload,
        sessionId: getSessionId(),
        conversationId,
        onToken: (chunk) => {
          if (firstToken) {
            firstToken = false;
            setLoading(false);
            setStreaming(true);
            setMessages((prev) => [...prev, { role: 'assistant', content: chunk }]);
          } else {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + chunk };
              return next;
            });
          }
        },
        onDone: (data) => {
          if (data?.conversation_id) setConversationId(data.conversation_id);
          if (firstToken && data?.reply) {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
          }
          setLoading(false);
          setStreaming(false);
        },
        onError: (msg) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}\n\nPlease try again in a moment.` }]);
          setLoading(false);
          setStreaming(false);
        }
      });
    },
    [messages, loading, streaming, conversationId]
  );

  const busy = loading || streaming;
  const showQuickReplies = started && !messages.some((m) => m.role === 'user');

  return (
    <div className="app">
      <div className="widget">
        <Header onClose={handleClose} />

        <div className="body">
          {!started ? (
            <WelcomeScreen onStart={start} />
          ) : (
            <MessageList messages={messages} loading={loading} showQuickReplies={showQuickReplies} onQuickPick={send} />
          )}
        </div>

        {started && <Composer onSend={send} disabled={busy} />}

        <footer className="footer">{CONFIG.footer}</footer>
      </div>
    </div>
  );
}
