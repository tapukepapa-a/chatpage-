import React, { useState, useEffect } from 'react';
import socket from './socket.js';
import { initialConversations } from './data/mockData';
import { checkSession, loginUser, registerUser, logoutUser, getRegistrationStatus } from './api/auth';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ChatSidebar from './components/chat/ChatSidebar';
import ChatArea from './components/chat/ChatArea';
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'register' | 'chat'
  const [currentUser, setCurrentUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeChatId, setActiveChatId] = useState('conv_1');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check authenticated session on load / refresh
  useEffect(() => {
    async function initAuth() {
      try {
        const [sessionData, regStatus] = await Promise.all([
          checkSession(),
          getRegistrationStatus()
        ]);

        setRegistrationStatus(regStatus);

        if (sessionData && sessionData.user) {
          setCurrentUser({
            id: sessionData.user._id,
            email: sessionData.user.email,
            name: sessionData.user.email.split('@')[0],
            slot: sessionData.user.slot,
            status: 'online'
          });
          if (sessionData.partner) {
            setPartner(sessionData.partner);
          }
          // Reconnect socket on page refresh (session cookie is still valid)
          if (!socket.connected) socket.connect();
          setCurrentView('chat');
        } else {
          setCurrentView('login');
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        setCurrentView('login');
      } finally {
        setIsCheckingSession(false);
      }
    }

    initAuth();
  }, []);

  // Update conversations dynamically when partner is available
  useEffect(() => {
    if (currentUser && partner) {
      const partnerName = partner.email.split('@')[0];
      setConversations((prev) => [
        {
          id: 'conv_partner',
          name: partnerName.charAt(0).toUpperCase() + partnerName.slice(1),
          email: partner.email,
          status: 'online',
          isTyping: false,
          messages: [
            {
              id: 'm_welcome',
              senderId: partner._id,
              text: `Welcome to our private sanctuary! 💜`,
              timestamp: 'Just now'
            }
          ]
        }
      ]);
      setActiveChatId('conv_partner');
    } else if (currentUser && !partner) {
      setConversations([
        {
          id: 'conv_waiting',
          name: 'Partner',
          email: 'Waiting for registration...',
          status: 'offline',
          isTyping: false,
          messages: [
            {
              id: 'm_wait',
              senderId: 'system',
              text: 'You are registered in Slot 1. Waiting for your partner to register their account...',
              timestamp: 'Just now'
            }
          ]
        }
      ]);
      setActiveChatId('conv_waiting');
    }
  }, [currentUser, partner]);

  // Auth Handlers
  const handleLogin = async (credentials) => {
    const res = await loginUser(credentials);
    const user = res.user;

    setCurrentUser({
      id: user._id,
      email: user.email,
      name: user.email.split('@')[0],
      slot: user.slot,
      status: 'online'
    });

    // Connect socket after successful auth
    socket.connect();

    // Check partner
    const sessionData = await checkSession();
    if (sessionData && sessionData.partner) {
      setPartner(sessionData.partner);
    }

    const regStatus = await getRegistrationStatus();
    setRegistrationStatus(regStatus);

    setCurrentView('chat');
  };

  const handleRegister = async (credentials) => {
    const res = await registerUser(credentials);
    const user = res.user;

    setCurrentUser({
      id: user._id,
      email: user.email,
      name: user.email.split('@')[0],
      slot: user.slot,
      status: 'online'
    });

    // Connect socket after successful registration
    socket.connect();

    const regStatus = await getRegistrationStatus();
    setRegistrationStatus(regStatus);

    // Check partner
    const sessionData = await checkSession();
    if (sessionData && sessionData.partner) {
      setPartner(sessionData.partner);
    }

    setCurrentView('chat');
  };
  const handleLogout = async () => {
    try {
      await logoutUser();
      socket.disconnect();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    setPartner(null);
    setCurrentView('login');
    setIsMobileChatOpen(false);

    // Refresh registration status
    const regStatus = await getRegistrationStatus();
    setRegistrationStatus(regStatus);
  };

  const handleReceiveMessage = (msg) => {
    // Update the active chat with a new incoming message
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeChatId) {
          // Avoid duplicate based on message id
          if (conv.messages.find((m) => m.id === msg.id)) return conv;
          return {
            ...conv,
            messages: [...conv.messages, msg]
          };
        }
        return conv;
      })
    );
  };

  const handleSendMessage = ({ text }) => {
    if (!currentUser) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      senderId: currentUser.id,
      text: text,
      timestamp: timeStr
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeChatId) {
          return {
            ...conv,
            messages: [...conv.messages, newMsg]
          };
        }
        return conv;
      })
    );
  };

  const activeConversation = conversations.find((c) => c.id === activeChatId) || conversations[0];

  // Select a chat from the sidebar
  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    // Open chat view on mobile
    setIsMobileChatOpen(true);
  };

  // Loading screen during initial session check
  if (isCheckingSession) {
    return (
      <div className="app-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--purple-300)' }}>
          <div className="btn-spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '14px', letterSpacing: '0.3px' }}>Verifying Sanctuary Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* View Routing */}
      {currentView === 'login' && (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToRegister={() => setCurrentView('register')}
          registrationStatus={registrationStatus}
        />
      )}

      {currentView === 'register' && (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={() => setCurrentView('login')}
          registrationStatus={registrationStatus}
        />
      )}

      {currentView === 'chat' && currentUser && (
        <div className={`chat-layout ${isMobileChatOpen ? 'mobile-active-chat' : ''}`}>
          {/* Sidebar */}
          <ChatSidebar
            currentUser={currentUser}
            conversations={conversations}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onLogout={handleLogout}
          />

          {/* Active Conversation Area */}
          <ChatArea
            conversation={activeConversation}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onBack={() => setIsMobileChatOpen(false)}
            onReceiveMessage={handleReceiveMessage}
          />
        </div>
      )}
    </div>
  );
}