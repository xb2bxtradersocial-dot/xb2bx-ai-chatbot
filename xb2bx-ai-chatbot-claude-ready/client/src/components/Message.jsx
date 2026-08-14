import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** A single chat row. Assistant messages render markdown (tables, bold, lists). */
export default function Message({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`msg-row ${isUser ? 'msg-row-user' : 'msg-row-bot'}`}>
      {!isUser && (
        <div className="msg-avatar">
          <img className="logo-img" src="/logo.png" alt="XB2BX" />
        </div>
      )}

      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-bot'}`}>
        {isUser ? (
          <span className="bubble-text">{content}</span>
        ) : (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
