import { useEffect, useRef, useState } from 'react';

// Parchment dialogue scroll + inscribed input. Enter sends, Shift+Enter inserts a newline.
export default function GuardianDialogue({ guardianName, messages, loading, sending, error, disabled, onSend, onRetry, placeholder }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const taRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, sending, error]);

  const submit = async () => {
    if (!text.trim() || sending || disabled) return;
    const t = text; setText('');
    const ok = await onSend(t);
    if (!ok) setText(t); // restore on failure
    taRef.current?.focus();
  };

  return (
    <div className="dialogue">
      <div className="dialogue-log parchment" role="log" aria-live="polite" aria-label="Conversation with the guardian">
        {loading && <div className="bubble guardian"><span className="speaker">{guardianName}</span><span className="dots"><i /><i /><i /></span></div>}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="speaker">{m.role === 'guardian' ? guardianName.toUpperCase() : 'YOU'}</span>
            <p>{m.text}</p>
          </div>
        ))}
        {sending && <div className="bubble guardian"><span className="speaker">{guardianName.toUpperCase()}</span><span className="dots" aria-label="The guardian is thinking"><i /><i /><i /></span></div>}
        {error && (
          <div className="bubble error" role="alert">
            <b>⚠ The message could not be delivered.</b>
            <p>{error}</p>
            {onRetry && <button className="stone-btn tiny" onClick={onRetry}>Try again</button>}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="scroll-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea ref={taRef} value={text} rows={2} maxLength={500} disabled={disabled || loading}
          placeholder={disabled ? 'The encounter has ended.' : placeholder || 'Speak to the guardian… (Enter sends)'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          aria-label="Your message to the guardian" />
        <button type="submit" className="stone-btn carved" disabled={disabled || loading || sending || !text.trim()}>{sending ? '…' : 'Send ➤'}</button>
      </form>
    </div>
  );
}
