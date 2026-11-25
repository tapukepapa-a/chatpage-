import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, LogOut } from 'lucide-react';
import Avatar from '../common/Avatar';
import MessageItem from './MessageItem';
import './ChatArea.css';
import socket from '../../socket.js';

// Disappearing messages: after both people have seen a message it stays on screen
// for VANISH_HOLD_MS, then fades out for VANISH_FADE_MS and is removed.
const VANISH_HOLD_MS = 10000;
const VANISH_FADE_MS = 800;

// Tick ranking so a status never goes backwards (sent -> delivered -> read)
const STATUS_RANK = { sent: 0, delivered: 1, read: 2 };

const formatMessage = (msg) => ({
  id: msg._id,
  senderId: msg.sender,
  text: msg.text,
  timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  status: msg.readAt ? 'read' : msg.deliveredAt ? 'delivered' : 'sent',
  acked: false,
  fading: false
});

export default function ChatArea({
  conversation,
  currentUser,
  onSendMessage,
  onBack,
  onLogout,
  isChatOpen = true
}) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('offline');
  const [isTabVisible, setIsTabVisible] = useState(document.visibilityState === 'visible');
  const messagesEndRef = useRef(null);
  const timersRef = useRef([]);

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
            const formatted = data.messages.map(formatMessage);
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
        const formatted = formatMessage(msg);
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

    // Ticks: server tells the sender when a message is delivered / read
    const handleStatus = ({ ids, status }) => {
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m.id) && STATUS_RANK[status] > STATUS_RANK[m.status] ? { ...m, status } : m
        )
      );
    };

    // Both people have seen these messages: hold briefly, fade out, then remove
    const handleVanish = ({ ids }) => {
      const holdTimer = setTimeout(() => {
        setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, fading: true } : m)));
        const removeTimer = setTimeout(() => {
          setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
        }, VANISH_FADE_MS);
        timersRef.current.push(removeTimer);
      }, VANISH_HOLD_MS);
      timersRef.current.push(holdTimer);
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
    socket.on('messages_status', handleStatus);
    socket.on('messages_vanish', handleVanish);

    return () => {
      socket.off('connect', requestStatus);
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('user_status', handleUserStatus);
      socket.off('message_error', handleMessageError);
      socket.off('messages_status', handleStatus);
      socket.off('messages_vanish', handleVanish);
    };
  }, [currentUser]);

  // Clear pending vanish timers when leaving the chat screen
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // Track whether the browser tab / app is actually visible
  useEffect(() => {
    const onVisibility = () => setIsTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A chat counts as "seen" only when it is really on screen:
  // tab visible, and (on phones) the chat screen is open, not the sidebar.
  const isMobileView = window.matchMedia('(max-width: 768px)').matches;
  const isChatVisible = isTabVisible && (!isMobileView || isChatOpen);

  // Send read receipts:
  //  - mark_read: I can see my partner's new messages
  //  - ack_read:  I can see that my messages were read (they may now vanish)
  useEffect(() => {
    if (!socket || !currentUser || !isChatVisible) return;
    const needsRead = messages.some((m) => m.senderId !== currentUser.id && m.status !== 'read');
    const needsAck = messages.some((m) => m.senderId === currentUser.id && m.status === 'read' && !m.acked);
    if (!needsRead && !needsAck) return;

    if (needsRead) socket.emit('mark_read');
    if (needsAck) socket.emit('ack_read');

    setMessages((prev) =>
      prev.map((m) => {
        if (m.senderId !== currentUser.id) return m.status !== 'read' ? { ...m, status: 'read' } : m;
        return m.status === 'read' && !m.acked ? { ...m, acked: true } : m;
      })
    );
  }, [messages, isChatVisible, currentUser]);

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

        {/* Mobile-only logout (the sidebar logout is hidden while a chat is open on phones) */}
        {onLogout && (
          <button
            type="button"
            className="mobile-logout-btn"
            onClick={onLogout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={18} />
          </button>
        )}
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