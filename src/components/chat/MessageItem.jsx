import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import './MessageItem.css';

export default function MessageItem({ message, isSent }) {
  const status = message.status || 'sent';

  return (
    <div
      className={`message-row ${isSent ? 'is-sent' : 'is-received'} ${message.fading ? 'is-fading' : ''}`}
    >
      <div className="message-bubble-wrapper">
        <div className="message-bubble">
          <p className="message-text">{message.text}</p>
          <div className="message-meta">
            <span className="message-time">{message.timestamp}</span>
            {isSent && (
              <span className={`message-ticks tick-${status}`} aria-label={status} title={status}>
                {status === 'sent' ? <Check size={14} /> : <CheckCheck size={14} />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}