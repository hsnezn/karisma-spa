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
      <div className="p-4 border-b border-slate-200 bg-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">{user.avatar}</div>
          <div>
            <h3 className="font-bold">{user.name}</h3>
            <p className="text-xs text-emerald-100">Online</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-emerald-700 rounded-full transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'operator' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
              msg.sender === 'operator' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 rounded-bl-none'
            }`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.sender === 'operator' ? 'text-emerald-100' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
          />
          <button
            onClick={handleSend}
            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
