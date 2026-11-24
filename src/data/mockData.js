export const currentUser = {
  id: 'user_1',
  email: 'alex@example.com',
  name: 'Alex',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  status: 'online'
};

export const initialConversations = [
  {
    id: 'conv_1',
    name: 'Elena Vance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    status: 'online', // 'online' | 'offline'
    isTyping: true,    // for frontend preview of typing indicator
    messages: [
      {
        id: 'm1',
        senderId: 'conv_1',
        text: 'Hey Alex! Are you ready for our meeting this evening?',
        timestamp: '18:42'
      },
      {
        id: 'm2',
        senderId: 'user_1',
        text: 'Yes, almost finished preparing the notes. See you at 7:00 PM!',
        timestamp: '18:44'
      },
      {
        id: 'm3',
        senderId: 'conv_1',
        text: 'Great! Let me know if you need me to review anything beforehand.',
        timestamp: '18:46'
      },
      {
        id: 'm4',
        senderId: 'user_1',
        text: 'All good on my end. Looking forward to it.',
        timestamp: '18:50'
      }
    ]
  },
  {
    id: 'conv_2',
    name: 'Julian Ross',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    status: 'offline',
    isTyping: false,
    messages: [
      {
        id: 'm201',
        senderId: 'conv_2',
        text: 'Hey, did you get a chance to look at the project specs?',
        timestamp: '14:20'
      },
      {
        id: 'm202',
        senderId: 'user_1',
        text: 'Taking a look right now, Julian.',
        timestamp: '14:25'
      }
    ]
  },
  {
    id: 'conv_3',
    name: 'Sophia Wright',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    status: 'online',
    isTyping: false,
    messages: [
      {
        id: 'm301',
        senderId: 'conv_3',
        text: 'Let me know whenever you are free to chat!',
        timestamp: 'Yesterday'
      }
    ]
  }
];
