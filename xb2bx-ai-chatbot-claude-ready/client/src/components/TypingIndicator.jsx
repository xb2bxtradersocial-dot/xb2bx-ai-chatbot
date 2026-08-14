export default function TypingIndicator() {
  return (
    <div className="msg-row msg-row-bot">
      <div className="msg-avatar">
        <img className="logo-img" src="/logo.png" alt="XB2BX" />
      </div>
      <div className="bubble bubble-bot typing">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}
