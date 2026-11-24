import React from 'react';
import './MessageItem.css';

export default function MessageItem({ message, isSent }) {
  return (
    <div className={`message-row ${isSent ? 'is-sent' : 'is-received'}`}>
      <div className="message-bubble-wrapper">
        <div className="message-bubble">
          <p className="message-text">{message.text}</p>
          <div className="message-meta">
            <span className="message-time">{message.timestamp}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
