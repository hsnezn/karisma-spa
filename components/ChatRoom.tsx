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
  initialMessages: Message[];
  onNewMessage: (msg: Message) => void;
}

const nationalityFlagSrc = (nationality?: string) => {
  if (nationality === 'Japan') return '/icons/country-jp.png';
  if (nationality === 'Philippines') return '/icons/country-ph.png';
  return null;
};

const ChatRoom: React.FC<ChatRoomProps> = ({ user, myId, onClose, initialMessages, onNewMessage }) => {
  const isSupport = user.id === 'staff-main';
  const [inputText, setInputText] = useState('');
  const messagesRef = React.useRef<Message[]>(initialMessages);
  const onNewMessageRef = React.useRef(onNewMessage);

  // Keep refs in sync with current props
  useEffect(() => {
    messagesRef.current = initialMessages;
  }, [initialMessages]);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  // REAL-TIME CHAT (Pusher)
  useEffect(() => {
    if (!pusherClient || !myId) return;

    // The channel ID must always be the Visitor's ID
    const guestId = myId === 'staff-main' ? user.id : myId;
    const channelName = `private-chat-${guestId}`;
    
    console.log('[ChatRoom] Subscribing to:', channelName, 'My ID:', myId);
    const channel = pusherClient.subscribe(channelName);

    const onIncoming = (data: any) => {
      console.log('[ChatRoom] Received message:', data);
      const msg: Message = { 
        id: data.id,
        text: data.text,
        sender: data.sender,
        timestamp: new Date(data.timestamp) 
      };
      
      // Use ref to check for duplicates without triggering resubscription
      if (!messagesRef.current.some(m => m.id === msg.id)) {
        onNewMessageRef.current(msg);
      }
    };

    channel.bind('new-message', onIncoming);

    return () => {
      if (pusherClient) {
        console.log('[ChatRoom] Unsubscribing from:', channelName);
        channel.unbind('new-message', onIncoming);
        pusherClient.unsubscribe(channelName);
      }
    };
  }, [user.id, myId]); // Stable dependencies

  const handleSend = async () => {
    if (!inputText.trim() || !myId) return;
    
    const guestId = myId === 'staff-main' ? user.id : myId;
    const channelName = `private-chat-${guestId}`;
    const myRole = myId === 'staff-main' ? 'operator' : 'user';

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Optimistic UI update
    const newMessage: Message = {
      id: messageId,
      text: inputText,
      sender: myRole,
      timestamp: new Date(),
    };
    
    onNewMessageRef.current(newMessage);
    const currentInput = inputText;
    setInputText('');

    console.log('[ChatRoom] Sending to:', channelName, 'Message:', currentInput);

    try {
      const response = await fetch('/api/pusher/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: messageId,
          text: currentInput,
          sender: myRole,
          channelName,
          guestId
        }),
      });
      if (!response.ok) {
        console.error('[ChatRoom] Server error:', await response.text());
      }
    } catch (error) {
      console.error('[ChatRoom] Network error:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-md bg-white flex flex-col z-[9999] shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300 h-[100dvh] md:h-screen overscroll-contain"
      style={{ height: '100dvh' }}
    >
      {/* Header */}
      <div className="safe-top p-3 md:p-6 border-b border-earth-light bg-earth-dark text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div className="bg-white/10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner overflow-hidden">
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-serif text-lg md:text-xl font-bold leading-tight">
              {user.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-[10px] md:text-xs text-earth-cream/70 uppercase tracking-widest font-bold">
                Live
              </p>
              {nationalityFlagSrc(user.nationality) && (
                <img
                  src={nationalityFlagSrc(user.nationality) as string}
                  alt={user.nationality}
                  className="w-4 h-4 md:w-5 md:h-5"
                />
              )}
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
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 bg-earth-cream/20">
        <div className="text-center py-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-earth-mid font-bold opacity-40">Today</span>
        </div>
        
        {initialMessages.map((msg) => (
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
      <div className="safe-bottom p-3 md:p-6 border-t border-earth-light bg-white shrink-0">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full pl-4 pr-4 py-3 bg-earth-cream/40 border-2 border-transparent focus:border-earth-dark rounded-2xl outline-none text-earth-dark text-sm md:text-base transition-all font-medium"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="bg-earth-dark text-white p-3 rounded-2xl hover:bg-accent-brown disabled:opacity-30 disabled:hover:bg-earth-dark transition-all shadow-lg active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
