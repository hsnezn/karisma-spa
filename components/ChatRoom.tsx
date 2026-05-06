'use client';

import React, { useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'operator';
  timestamp: Date;
}

interface ChatRoomProps {
  user: { id: string; name: string; avatar: string };
  onClose: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ user, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `Hello! I'm ${user.name}. I'd like to book a massage.`, sender: 'user', timestamp: new Date() },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'operator',
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div 
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col z-50 border-l border-slate-200 transition-transform duration-300 ease-in-out transform translate-x-0"
    >
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-earth-light bg-earth-dark text-white flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-white/10 p-1.5 md:p-2 rounded-full text-lg md:text-xl">{user.avatar}</div>
          <div>
            <h3 className="font-bold text-sm md:text-base">{user.name}</h3>
            <p className="text-[10px] md:text-xs text-earth-cream/60 italic">Online • Karisma Bliss</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 md:p-2 hover:bg-accent-brown rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-earth-cream/30">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'operator' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
              msg.sender === 'operator' 
                ? 'bg-earth-dark text-white rounded-br-none' 
                : 'bg-white text-earth-dark rounded-bl-none border border-earth-light'
            }`}>
              <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[9px] mt-1.5 ${msg.sender === 'operator' ? 'text-earth-cream/50' : 'text-earth-mid'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-earth-light bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-earth-cream/50 border-none rounded-full focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark text-sm"
          />
          <button
            onClick={handleSend}
            className="bg-earth-dark text-white p-2.5 rounded-full hover:bg-accent-brown transition-colors shadow-md transform active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
