'use client';

import React, { useState, useEffect } from 'react';
import ChatRoom from '@/components/ChatRoom';
import { pusherClient } from '@/lib/pusher';

interface User {
  id: string;
  name: string;
  avatar: string;
  nationality?: 'Japan' | 'Philippines';
}

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<User[]>([]);
  const [selectedNationality, setSelectedNationality] = useState<'All' | 'Japan' | 'Philippines'>('All');
  const [loginView, setLoginView] = useState<'none' | 'user' | 'operator' | 'create-account'>('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'operator' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showStaffField, setShowStaffField] = useState(false);
  const [error, setError] = useState('');

  // REAL-TIME VISITOR TRACKING (Pusher Presence)
  useEffect(() => {
    if (!pusherClient) return;

    const channel = pusherClient.subscribe('presence-visitors');

    if (userRole === 'operator') {
      channel.bind('pusher:subscription_succeeded', (members: any) => {
        const membersList: User[] = [];
        members.each((member: any) => {
          if (member.id !== 'staff-main') {
            membersList.push({
              id: member.id,
              name: member.info.name,
              avatar: member.info.avatar,
              nationality: member.info.nationality
            });
          }
        });
        setActiveVisitors(membersList);
      });

      channel.bind('pusher:member_added', (member: any) => {
        setActiveVisitors(prev => [...prev, {
          id: member.id,
          name: member.info.name,
          avatar: member.info.avatar,
          nationality: member.info.nationality
        }]);
      });

      channel.bind('pusher:member_removed', (member: any) => {
        setActiveVisitors(prev => prev.filter(m => m.id !== member.id));
      });
    }

    return () => {
      if (pusherClient) pusherClient.unsubscribe('presence-visitors');
    };
  }, [userRole]);

  // Filter visitors by selected nationality
  const filteredVisitors = activeVisitors.filter(v => 
    selectedNationality === 'All' || v.nationality === selectedNationality
  );

  // PERSISTENT LOGIN EFFECT
  useEffect(() => {
    const savedUser = localStorage.getItem('karisma_session');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setIsLoggedIn(true);
      setUserRole(userData.role);
      setUsername(userData.user);
      if (userData.role === 'operator') setShowDashboard(true);
    }
  }, []);

  // Simulated User Database
  const [registeredUsers, setRegisteredUsers] = useState([
    { user: 'staff_admin', pass: 'karisma2026', role: 'operator' },
    { user: 'guest_user', pass: 'welcome', role: 'user' }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('karisma_users');
    if (saved) setRegisteredUsers(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('karisma_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const handleLogin = (requestedRole: 'user' | 'operator') => {
    const user = registeredUsers.find(u => 
      u.user.toLowerCase() === username.toLowerCase() && u.pass === password
    );

    if (user) {
      if (user.role === requestedRole) {
        setIsLoggedIn(true);
        setUserRole(user.role);
        setLoginView('none');
        setError('');
        if (user.role === 'operator') setShowDashboard(true);
        localStorage.setItem('karisma_session', JSON.stringify({ user: user.user, role: user.role }));
      } else {
        setError(`This account is registered as a ${user.role}.`);
      }
    } else {
      setError(`Invalid credentials.`);
    }
  };

  const handleCreateAccount = () => {
    if (!username || !password) {
      setError('Fill in all fields.');
      return;
    }
    const STAFF_SECRET = "KARISMA-STAFF-2026";
    let role: 'user' | 'operator' = 'user';
    if (showStaffField && inviteCode === STAFF_SECRET) role = 'operator';
    else if (showStaffField) { setError('Invalid Staff Code.'); return; }

    const newUser = { user: username, pass: password, role };
    setRegisteredUsers([...registeredUsers, newUser]);
    setIsLoggedIn(true);
    setUserRole(role);
    setLoginView('none');
    if (role === 'operator') setShowDashboard(true);
    localStorage.setItem('karisma_session', JSON.stringify({ user: username, role }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setShowDashboard(false);
    localStorage.removeItem('karisma_session');
  };

  return (
    <main className="min-h-screen bg-earth-cream text-earth-dark font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-40 bg-white/95 backdrop-blur-md border-b border-earth-light">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-base md:text-2xl font-serif italic text-earth-dark font-bold tracking-tight uppercase leading-none">
              Karisma
            </div>
            <span className="text-[7px] md:text-sm font-normal normal-case text-earth-mid">Home & Hotel Massage</span>
          </div>
          <div className="flex items-center gap-1 md:gap-4">
            {!isLoggedIn ? (
              <>
                <button onClick={() => setLoginView('create-account')} className="text-earth-dark text-[9px] md:text-sm font-bold px-1">Join</button>
                <button onClick={() => setLoginView('user')} className="text-earth-dark text-[9px] md:text-sm font-bold px-1.5 md:px-4">Login</button>
                <button onClick={() => setLoginView('operator')} className="bg-earth-dark text-white px-2 md:px-6 py-1 md:py-2 rounded-full text-[9px] md:text-sm font-bold">Staff</button>
              </>
            ) : (
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-[9px] md:text-sm italic truncate max-w-[40px] md:max-w-none">Hi, {username}</span>
                {userRole === 'operator' && (
                  <button onClick={() => setShowDashboard(!showDashboard)} className="text-[9px] md:text-sm font-bold underline bg-earth-cream px-1.5 py-1 rounded">
                    {showDashboard ? 'Site' : 'Visitors'}
                  </button>
                )}
                <button onClick={handleLogout} className="text-earth-mid text-[9px] md:text-sm font-bold">Out</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Login Overlay */}
      {loginView !== 'none' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-earth-dark/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-earth-light">
            <h3 className="text-2xl font-serif text-earth-dark mb-6 text-center">
              {loginView === 'operator' ? 'Staff Portal' : loginView === 'create-account' ? 'Join Karisma' : 'Welcome Back'}
            </h3>
            {error && <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl mb-4 text-center font-bold">{error}</div>}
            <div className="space-y-4">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light outline-none" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light outline-none" />
              {loginView === 'create-account' && (
                <div className="pt-2">
                  {!showStaffField ? (
                    <button onClick={() => setShowStaffField(true)} className="text-[10px] text-earth-light hover:text-earth-dark font-bold uppercase">Staff?</button>
                  ) : (
                    <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Staff Code" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light outline-none mt-2" />
                  )}
                </div>
              )}
              <button onClick={() => loginView === 'create-account' ? handleCreateAccount() : handleLogin(loginView as 'user' | 'operator')} className="w-full bg-earth-dark text-white py-4 rounded-xl font-bold uppercase">
                {loginView === 'create-account' ? 'Create' : 'Sign In'}
              </button>
              <button onClick={() => setLoginView('none')} className="w-full text-earth-mid text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-16 md:pt-20">
        {!showDashboard ? (
          <div className="relative">
            {/* HERO */}
            <section className="relative h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=2070" alt="Hero" className="w-full h-full object-cover grayscale-[20%]" />
              </div>
              <div className="relative z-20 text-white space-y-8">
                <h1 className="text-4xl md:text-8xl font-serif">Find your <span className="italic font-light">bliss</span></h1>
                <button className="border border-white px-8 md:px-12 py-3 text-[10px] md:text-sm tracking-widest font-light hover:bg-white hover:text-earth-dark transition-all uppercase">Book Your Escape</button>
              </div>
            </section>

            {/* BEYOND BLISSED */}
            <section className="bg-earth-dark text-earth-cream py-16 px-6 md:px-20 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 max-w-xl">
                <h2 className="text-3xl md:text-5xl font-serif">Beyond <span className="italic font-light">Blissed</span></h2>
                <p className="opacity-90 leading-relaxed">At Karisma, we believe that physical and mental well-being go hand in hand. We offer great relaxation deep within at your own comfort place.</p>
              </div>
              <div className="flex flex-col gap-4">
                <img src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" className="rounded-sm shadow-2xl h-48 object-cover" alt="Spa" />
                <img src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800" className="rounded-sm shadow-2xl h-48 object-cover self-end -mt-12 w-[80%]" alt="Spa" />
              </div>
            </section>

            {/* MENU */}
            <section className="bg-earth-light py-16 px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-earth-dark mb-10">Blissful Karisma Menu</h2>
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: 'Nuru', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Yoni', img: 'https://images.unsplash.com/photo-1612110186545-798d9b96a40f?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Relaxation', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Best', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Combo', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400' }
                ].map((item, i) => (
                  <div key={i} className="relative aspect-square group cursor-pointer overflow-hidden border-4 border-white shadow-xl">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center p-2">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* DASHBOARD */
          <div className="max-w-6xl mx-auto py-12 px-6">
            <div className="mb-12 border-b border-earth-light pb-6">
              <h2 className="text-3xl font-serif text-earth-dark uppercase tracking-widest">Visitor Tracking</h2>
              <p className="text-earth-mid text-sm italic">Real-time visitor insights and engagement (SalesIQ style).</p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-earth-light min-h-[500px]">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-earth-cream/50 px-3 py-1.5 rounded-full shadow-sm border border-earth-light">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-earth-dark text-[10px] font-bold uppercase tracking-widest font-mono">Live Visitors</span>
                  </div>
                  <div className="flex bg-earth-cream rounded-lg p-1 border border-earth-light">
                    {(['All', 'Japan', 'Philippines'] as const).map((nat) => (
                      <button
                        key={nat}
                        onClick={() => setSelectedNationality(nat)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-tighter rounded-md transition-all ${
                          selectedNationality === nat 
                            ? 'bg-earth-dark text-white shadow-md' 
                            : 'text-earth-mid hover:text-earth-dark'
                        }`}
                      >
                        {nat === 'Japan' ? '🇯🇵 Japan' : nat === 'Philippines' ? '🇵🇭 PH' : '🌍 All'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-earth-mid text-[10px] uppercase font-bold tracking-widest">
                  Showing {filteredVisitors.length} users from {selectedNationality}
                </div>
              </div>
              
              <div className="grid gap-4">
                {filteredVisitors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-earth-mid italic">
                    <p>No active visitors from {selectedNationality}...</p>
                  </div>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <div key={visitor.id} className="group bg-earth-cream/20 hover:bg-earth-cream/40 p-4 md:p-6 rounded-2xl border border-earth-light transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-earth-dark text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                          {visitor.avatar}
                        </div>
                        <div>
                          <h4 className="font-serif text-lg text-earth-dark font-bold">{visitor.name}</h4>
                          <div className="flex gap-3 text-[10px] uppercase font-bold tracking-widest text-earth-mid">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online</span>
                            <span>•</span>
                            <span className="text-earth-dark">{visitor.nationality === 'Japan' ? '🇯🇵 Japanese' : '🇵🇭 Filipino'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(visitor)}
                        className="bg-earth-dark text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-md hover:bg-accent-brown transition-all active:scale-95"
                      >
                        Initiate Chat
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Group Visitors', val: filteredVisitors.length.toString(), color: 'text-earth-dark' },
                  { label: 'Live Chats', val: '0', color: 'text-emerald-600' },
                  { label: 'Avg Time', val: '4m 20s', color: 'text-amber-600' },
                  { label: 'Conversion', val: '12%', color: 'text-blue-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-earth-cream/30 p-3 md:p-4 rounded-2xl border border-earth-light">
                    <p className="text-earth-mid text-[8px] md:text-[10px] uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-lg md:text-2xl font-bold ${stat.color}`}>{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat (User Side) */}
      {!showDashboard && !selectedUser && (
        <div className="fixed bottom-6 right-6 z-[100] animate-bounce hover:animate-none">
          <button onClick={() => setSelectedUser({ id: 'staff-main', name: 'Karisma Support', avatar: '🧘' })} className="bg-earth-dark text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform border-4 border-white flex items-center gap-2 group">
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-sm font-bold uppercase tracking-widest px-0 group-hover:px-2">Chat with us</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
      )}

      {/* Chat Room */}
      {selectedUser && (
        <ChatRoom user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Footer */}
      <footer className="bg-earth-dark text-earth-cream py-16 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-2xl font-serif italic font-bold uppercase tracking-widest mb-4">Karisma</div>
          <p className="text-xs opacity-60 mb-8 max-w-md mx-auto">Physical and mental well-being for your home & hotel massage needs.</p>
          <div className="text-[10px] opacity-40 uppercase tracking-widest">© 2026 Karisma Massage Services.</div>
        </div>
      </footer>
    </main>
  );
}
