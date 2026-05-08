'use client';

import React, { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'operator';
  timestamp: Date;
}

interface ChatRoomProps {
  user: { id: string; name: string; avatar: string; nationality?: string };
  myId: string;
  onClose: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ user, myId, onClose }) => {
  const isSupport = user.id === 'staff-main';
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // REAL-TIME CHAT (Pusher)
  useEffect(() => {
    if (!pusherClient || !myId) return;

    // Unique channel for this specific conversation
    // We always use the guest's ID as the unique channel name
    const guestId = isSupport ? user.id : myId;
    const channelName = `private-chat-${guestId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('new-message', (data: Message) => {
      // Avoid duplicates if the sender is also the one receiving the event
      setMessages(prev => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, { ...data, timestamp: new Date(data.timestamp) }];
      });
    });

    return () => {
      if (pusherClient) pusherClient.unsubscribe(channelName);
    };
  }, [user.id, myId]);

  const handleSend = async () => {
    if (!inputText.trim() || !myId) return;
    
    const guestId = isSupport ? user.id : myId;
    const channelName = `private-chat-${guestId}`;
    const sender = isSupport ? 'operator' : 'user';

    // Optimistic UI update
    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      text: inputText,
      sender: sender,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    try {
      await fetch('/api/pusher/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sender: sender,
          channelName
        }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-md bg-white flex flex-col z-[9999] shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300 h-[100dvh] md:h-screen overscroll-contain"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="safe-top p-4 md:p-6 border-b border-earth-light bg-earth-dark text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div className="bg-white/10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-inner">
            {user.avatar}
          </div>
          <div>
            <h3 className="font-serif text-lg md:text-xl font-bold leading-tight">
              {user.name} {user.nationality === 'Japan' ? '🇯🇵' : user.nationality === 'Philippines' ? '🇵🇭' : ''}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-[10px] md:text-xs text-earth-cream/70 uppercase tracking-widest font-bold">
                Live {user.nationality || 'Visitor'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="hidden md:flex p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-earth-cream/20">
        <div className="text-center py-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-earth-mid font-bold opacity-40">Today</span>
        </div>
        
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col ${
              (isSupport && msg.sender === 'user') || (!isSupport && msg.sender === 'operator') 
                ? 'items-end' : 'items-start'
            }`}
          >
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
              (isSupport && msg.sender === 'user') || (!isSupport && msg.sender === 'operator')
                ? 'bg-earth-dark text-white rounded-tr-none' 
                : 'bg-white text-earth-dark rounded-tl-none border border-earth-light'
            }`}>
              <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
            </div>
            <span className="text-[9px] mt-1.5 px-1 font-bold text-earth-mid/60 uppercase">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="safe-bottom p-4 md:p-6 border-t border-earth-light bg-white shrink-0">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full pl-4 pr-12 py-3.5 bg-earth-cream/40 border-2 border-transparent focus:border-earth-dark rounded-2xl outline-none text-earth-dark text-sm md:text-base transition-all font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
              <span className="text-xl grayscale opacity-30 cursor-pointer hover:grayscale-0 hover:opacity-100 transition-all">😊</span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="bg-earth-dark text-white p-3.5 rounded-2xl hover:bg-accent-brown disabled:opacity-30 disabled:hover:bg-earth-dark transition-all shadow-lg active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
