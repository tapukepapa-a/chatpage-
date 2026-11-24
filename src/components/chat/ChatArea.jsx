import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import Avatar from '../common/Avatar';
import MessageItem from './MessageItem';
import './ChatArea.css';
import socket from '../../socket.js';

export default function ChatArea({
  conversation,
  currentUser,
  onSendMessage,
  onBack
}) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('offline');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history when component mounts or conversation changes
  useEffect(() => {
    // Reset local state when conversation prop changes
    setMessages(conversation?.messages || []);
    setIsPartnerTyping(false);

    // Load history from backend (authenticated via cookie)
    async function fetchHistory() {
      try {
        const res = await fetch('/api/messages?limit=200', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.messages)) {
            // Convert backend message format to the shape used by MessageItem
            const formatted = data.messages.map((msg) => ({
              id: msg._id,
              senderId: msg.sender,
              text: msg.text,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formatted);
          }
        } else {
          console.warn('Failed to fetch chat history', res.status);
        }
      } catch (e) {
        console.error('Error fetching chat history', e);
      }
    }
    fetchHistory();
  }, [conversation?.id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        // Prevent duplicate messages based on MongoDB _id
        if (prev.find((m) => m.id === msg._id)) return prev;
        const formatted = {
          id: msg._id,
          senderId: msg.sender,
          text: msg.text,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        return [...prev, formatted];
      });
    };

    const handleTyping = ({ userId }) => {
      if (currentUser && userId !== currentUser.id) {
        setIsPartnerTyping(true);
      }
    };

    const handleStopTyping = ({ userId }) => {
      if (currentUser && userId !== currentUser.id) {
        setIsPartnerTyping(false);
      }
    };

    const handleUserStatus = ({ userId, status }) => {
      if (currentUser && userId !== currentUser.id) {
        setPartnerStatus(status);
      }
    };

    const handleMessageError = (err) => {
      console.error('Socket message error:', err);
    };

    // Ask for partner's status now that listeners are attached (and after reconnects)
    const requestStatus = () => socket.emit('get_partner_status');
    if (socket.connected) requestStatus();
    socket.on('connect', requestStatus);

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('user_status', handleUserStatus);
    socket.on('message_error', handleMessageError);

    return () => {
      socket.off('connect', requestStatus);
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('user_status', handleUserStatus);
      socket.off('message_error', handleMessageError);
    };
  }, [currentUser]);

  // Emit typing events
  useEffect(() => {
    if (!socket) return;
    const timeoutId = setTimeout(() => {
      if (inputText.trim()) {
        socket.emit('typing');
      } else {
        socket.emit('stop_typing');
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputText]);

  // Scroll when messages change or typing indicator updates
  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const clientMessageId = crypto.randomUUID();
    socket.emit('send_message', { text: inputText.trim(), clientMessageId });
    setInputText('');
  };

  if (!conversation) {
    return (
      <div className="chat-area-empty">
        <div className="empty-chat-visual">
          <h3>Select a conversation</h3>
          <p>Choose a chat from the sidebar to start messaging.</p>
        </div>
      </div>
    );
  }

  const isOnline = partnerStatus === 'online';

  return (
    <main className="chat-area">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          {/* Mobile Back Button */}
          <button
            type="button"
            className="mobile-back-btn"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="header-contact-info">
            <Avatar
              src={conversation.avatar}
              name={conversation.name}
              size="md"
              status={partnerStatus}
            />
            <div className="header-text-details">
              <span className="header-name">{conversation.name}</span>
              <span className={`header-status-indicator ${isOnline ? 'status-online-text' : 'status-offline-text'}`}>
                <span className={`header-status-dot ${isOnline ? 'is-online' : 'is-offline'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Thread */}
      <div className="messages-container">
        {/* Messages List */}
        {messages?.map((msg) => {
          const isSent = msg.senderId === currentUser.id;
          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isSent={isSent}
            />
          );
        })}

        {/* Typing Indicator */}
        {isPartnerTyping && (
          <div className="typing-indicator-row">
            <div className="typing-indicator-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <span className="typing-indicator-label">
              {conversation.name} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-input-form">
          <input
            type="text"
            className="chat-text-input"
            placeholder={`Message ${conversation.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputText.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </main>
  );
}