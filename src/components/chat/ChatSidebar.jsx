import React, { useState } from 'react';
import { Search, LogOut, X, MessageSquare } from 'lucide-react';
import Avatar from '../common/Avatar';
import './ChatSidebar.css';

export default function ChatSidebar({
  currentUser,
  conversations,
  activeChatId,
  onSelectChat,
  onLogout
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on name or last message
  const filtered = conversations.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesName = c.name.toLowerCase().includes(query);
    const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1].text.toLowerCase() : '';
    const matchesMsg = lastMsg.includes(query);
    return matchesName || matchesMsg;
  });

  const getLastMessageSnippet = (c) => {
    if (!c.messages || c.messages.length === 0) return 'No messages yet';
    return c.messages[c.messages.length - 1].text;
  };

  const getLastTimestamp = (c) => {
    if (!c.messages || c.messages.length === 0) return '';
    return c.messages[c.messages.length - 1].timestamp;
  };

  return (
    <aside className="chat-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <MessageSquare size={19} />
          </div>
          <div>
            <h2 className="brand-name">Just Us</h2>
          </div>
        </div>

        <button
          type="button"
          className="header-logout-btn"
          onClick={onLogout}
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut size={17} />
        </button>
      </div>

      {/* Current User Chip */}
      <div className="current-user-banner">
        <Avatar
          src={currentUser.avatar}
          name={currentUser.name}
          size="sm"
          status={currentUser.status}
        />
        <div className="user-text-col">
          <div className="user-full-name">{currentUser.name}</div>
          <div className="user-email-text">{currentUser.email}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search-container">
        <div className="sidebar-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="sidebar-conversations-scroll">
        {filtered.length > 0 ? (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`conversation-item ${c.id === activeChatId ? 'is-active' : ''}`}
              onClick={() => onSelectChat(c.id)}
            >
              <div className="conv-avatar-col">
                <Avatar
                  src={c.avatar}
                  name={c.name}
                  size="md"
                  status={c.status}
                />
              </div>

              <div className="conv-content-col">
                <div className="conv-top-row">
                  <span className="conv-name">{c.name}</span>
                  <span className="conv-time">{getLastTimestamp(c)}</span>
                </div>

                <div className="conv-bottom-row">
                  <p className="conv-last-msg">{getLastMessageSnippet(c)}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-search-state">
            <p>No conversations found</p>
            <span>Try a different name or keyword</span>
          </div>
        )}
      </div>
    </aside>
  );
}
