'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ChatRoom from '@/components/ChatRoom';

const Radar = dynamic(() => import('@/components/Radar'), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-earth-cream animate-pulse rounded-3xl flex items-center justify-center text-earth-dark font-bold italic">Loading Karisma Map...</div>
});

interface User {
  id: string;
  name: string;
  avatar: string;
}

export default function Home() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [loginView, setLoginView] = useState<'none' | 'user' | 'operator' | 'create-account'>('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'operator' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showStaffField, setShowStaffField] = useState(false);
  const [error, setError] = useState('');

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

  // Simulated User Database with LocalStorage Persistence
  const [registeredUsers, setRegisteredUsers] = useState([
    { user: 'staff_admin', pass: 'karisma2026', role: 'operator' },
    { user: 'guest_user', pass: 'welcome', role: 'user' }
  ]);

  // Handle persistence in useEffect to avoid Hydration Mismatch
  useEffect(() => {
    const saved = localStorage.getItem('karisma_users');
    if (saved) {
      setRegisteredUsers(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('karisma_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  const handleLogin = (requestedRole: 'user' | 'operator') => {
    // Find user by name (case-insensitive) and pass (case-sensitive)
    const user = registeredUsers.find(u => 
      u.user.toLowerCase() === username.toLowerCase() && 
      u.pass === password
    );

    if (user) {
      // Check if the role matches what portal they are in
      if (user.role === requestedRole) {
        setIsLoggedIn(true);
        setUserRole(user.role);
        setLoginView('none');
        setError('');
        if (user.role === 'operator') setShowDashboard(true);
        // Save session
        localStorage.setItem('karisma_session', JSON.stringify({ user: user.user, role: user.role }));
      } else {
        setError(`This account is registered as a ${user.role}. Please use the correct portal.`);
      }
    } else {
      setError(`Invalid username or password.`);
    }
  };

  const handleCreateAccount = () => {
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const STAFF_SECRET = "KARISMA-STAFF-2026";
    let role: 'user' | 'operator' = 'user';

    if (showStaffField && inviteCode === STAFF_SECRET) {
      role = 'operator';
    } else if (showStaffField && inviteCode !== STAFF_SECRET) {
      setError('Invalid Staff Invite Code.');
      return;
    }

    if (registeredUsers.find(u => u.user === username)) {
      setError('Username already exists.');
      return;
    }

    const newUser = { user: username, pass: password, role };
    setRegisteredUsers([...registeredUsers, newUser]);
    
    setIsLoggedIn(true);
    setUserRole(role);
    setLoginView('none');
    if (role === 'operator') setShowDashboard(true);
    setError('');
    // Save session
    localStorage.setItem('karisma_session', JSON.stringify({ user: username, role }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setShowDashboard(false);
    setUsername('');
    setPassword('');
    setInviteCode('');
    setShowStaffField(false);
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
                <button 
                  onClick={() => { setLoginView('create-account'); setError(''); }}
                  className="text-earth-dark text-[9px] md:text-sm font-bold px-1"
                >
                  Join
                </button>
                <button 
                  onClick={() => { setLoginView('user'); setError(''); }}
                  className="text-earth-dark text-[9px] md:text-sm font-bold border-earth-dark px-1.5 md:px-4 py-1 md:py-2 rounded-full"
                >
                  Login
                </button>
                <button 
                  onClick={() => { setLoginView('operator'); setError(''); }}
                  className="bg-earth-dark text-white px-2 md:px-6 py-1 md:py-2 rounded-full text-[9px] md:text-sm font-bold shadow-lg"
                >
                  Staff
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 md:gap-4">
                <span className="text-[9px] md:text-sm italic truncate max-w-[40px] md:max-w-none">Hi, {userRole === 'operator' ? 'Staff' : username}</span>
                {userRole === 'operator' && (
                  <button onClick={() => setShowDashboard(!showDashboard)} className="text-[9px] md:text-sm font-bold underline bg-earth-cream px-1.5 py-1 rounded">
                    {showDashboard ? 'Site' : 'Map'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-earth-dark/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md p-6 md:p-8 md:rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-earth-light overflow-y-auto">
            <div className="flex justify-end md:hidden mb-4">
              <button onClick={() => { setLoginView('none'); setShowStaffField(false); setInviteCode(''); }} className="p-2 text-earth-dark">✕</button>
            </div>
            <div className="text-center mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-serif text-earth-dark mb-2">
                {loginView === 'operator' ? 'Staff Portal' : 
                 loginView === 'create-account' ? 'Create Your Account' : 'Welcome Back'}
              </h3>
              <p className="text-earth-mid text-xs md:text-sm italic">Experience the Karisma Bliss</p>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {loginView === 'operator' && (
                <div className="p-3 bg-earth-cream rounded-xl border border-earth-light text-[10px] text-earth-mid italic text-center mb-2">
                  Staff Admin: <span className="font-bold text-earth-dark">staff_admin</span> / <span className="font-bold text-earth-dark">karisma2026</span>
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 text-[10px] md:text-xs rounded-xl border border-red-200 font-bold animate-pulse">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-[10px] md:text-xs font-black text-earth-dark uppercase mb-1">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-2.5 md:py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark font-bold text-sm" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs font-black text-earth-dark uppercase mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 md:py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark font-bold text-sm" />
              </div>

              {loginView === 'create-account' && (
                <div className="pt-1 md:pt-2">
                  {!showStaffField ? (
                    <button onClick={() => setShowStaffField(true)} className="text-[9px] md:text-[10px] text-earth-light hover:text-earth-dark transition-colors uppercase tracking-widest font-bold">Are you staff? Click here</button>
                  ) : (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] md:text-xs font-bold text-earth-dark uppercase mb-1">Staff Invite Code</label>
                      <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Enter secret code" className="w-full px-4 py-2.5 md:py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark text-sm" />
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => { if (loginView === 'create-account') handleCreateAccount(); else handleLogin(loginView as 'user' | 'operator'); }} className="w-full bg-earth-dark text-white py-3 md:py-4 rounded-xl font-bold hover:bg-accent-brown transition-all mt-2 md:mt-4 uppercase tracking-widest text-xs md:text-base">
                {loginView === 'create-account' ? 'Create Account' : 'Sign In'}
              </button>
              <button onClick={() => { setLoginView('none'); setShowStaffField(false); setInviteCode(''); }} className="w-full text-earth-mid text-xs md:text-sm hover:text-earth-dark transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-16 md:pt-20">
        {!showDashboard ? (
          <div className="relative">
            {/* HERO SECTION - MATCHING IMAGE */}
            <section className="relative h-[80vh] md:h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=2070" 
                  alt="Massage Hero" 
                  className="w-full h-full object-cover grayscale-[20%]"
                />
              </div>
              
              <div className="relative z-20 text-white space-y-8 md:space-y-12">
                <h1 className="text-4xl md:text-8xl font-serif leading-tight">
                  Find your <span className="italic font-light">bliss</span>
                </h1>
                <button className="bg-transparent border border-white px-8 md:px-12 py-3 text-[10px] md:text-sm tracking-[0.2em] font-light hover:bg-white hover:text-earth-dark transition-all uppercase">
                  Book Your Escape
                </button>
              </div>
            </section>

            {/* BEYOND BLISSED SECTION - MATCHING IMAGE */}
            <section className="bg-earth-dark text-earth-cream py-16 md:py-24 px-6 md:px-20 grid md:grid-cols-2 gap-12 items-center overflow-hidden">
              <div className="space-y-6 md:space-y-8 max-w-xl">
                <h2 className="text-3xl md:text-5xl font-serif">
                  Beyond <span className="italic font-light">Blissed</span>
                </h2>
                <p className="text-base md:text-lg leading-relaxed font-light opacity-90">
                  At Karisma, we believe that physical and mental well-being go hand in hand. We don't just offer a brief escape from the daily grind; we offer great relaxation deep within. When you regularly make time for yourself, your bliss can bless every part of your life with more energy and peace at your own comfort place.
                </p>
              </div>
              <div className="flex flex-col gap-4 relative">
                <img 
                  src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" 
                  alt="Stones Massage" 
                  className="rounded-sm shadow-2xl h-48 md:h-64 w-full object-cover"
                />
                <img 
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800" 
                  alt="Spa Flower" 
                  className="rounded-sm shadow-2xl h-48 md:h-64 w-[80%] md:w-full object-cover self-end md:ml-12 md:-mt-12"
                />
              </div>
            </section>

            {/* MENU SECTION - MATCHING IMAGE */}
            <section className="bg-earth-light py-16 md:py-24 px-4 md:px-6 text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-earth-dark mb-10 md:mb-16">Blissful Karisma Menu</h2>
              
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {[
                  { name: 'Nuru Massage', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Yoni Massage', img: 'https://images.unsplash.com/photo-1612110186545-798d9b96a40f?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Deep Relaxation', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Best Massage', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Combination', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400' }
                ].map((item, i) => (
                  <div key={i} className="relative aspect-square group cursor-pointer overflow-hidden shadow-xl border-2 md:border-4 border-white">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest text-center leading-tight drop-shadow-md">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-16 md:mt-24 space-y-8 md:space-y-12">
                <h2 className="text-2xl md:text-5xl font-serif text-earth-dark underline underline-offset-8 decoration-earth-mid">
                  Book Your Escape Now!<br />Connect With Us.
                </h2>
                
                <div className="space-y-4 md:space-y-6 text-lg md:text-3xl font-black text-earth-dark">
                  <p className="flex items-center justify-center gap-2 md:gap-3">
                    <span className="text-earth-mid text-[9px] md:text-sm uppercase tracking-widest font-bold">Viber</span> 
                    09104314293
                  </p>
                  <p className="flex items-center justify-center gap-2 md:gap-3">
                    <span className="text-earth-mid text-[9px] md:text-sm uppercase tracking-widest font-bold">Whatsapp</span> 
                    09104314293
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-earth-light pb-6 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif text-earth-dark mb-1 md:mb-2 uppercase tracking-widest">Operator Radar</h2>
                <p className="text-earth-mid text-xs md:text-sm italic font-light">Managing bliss across branches in real-time.</p>
              </div>
              <div className="text-left md:text-right w-full md:w-auto">
                <p className="text-[8px] md:text-[10px] uppercase font-bold tracking-[0.2em] text-earth-light mb-1">Secret Staff Code</p>
                <code className="bg-earth-dark text-white px-2 md:px-3 py-1 rounded text-[10px] md:text-xs">KARISMA-STAFF-2026</code>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-2 md:p-4 shadow-2xl relative overflow-hidden border border-earth-light">
              <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 flex items-center gap-2 bg-white/80 backdrop-blur px-2 md:px-3 py-1 rounded-full shadow-sm border border-earth-light">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-earth-dark text-[8px] md:text-[10px] font-bold uppercase tracking-widest font-mono">Live Tracker</span>
              </div>
              
              <Radar onUserClick={(user) => setSelectedUser(user)} />
              
              <div className="mt-4 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Active Sessions', val: '12', color: 'text-earth-dark' },
                  { label: 'Available Staff', val: '8', color: 'text-emerald-600' },
                  { label: 'Pending Bookings', val: '5', color: 'text-amber-600' },
                  { label: 'System Load', val: 'Optimal', color: 'text-blue-600' }
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

      {/* Chat Overlay */}
      {selectedUser && (
        <ChatRoom user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Footer */}
      <footer className="bg-earth-dark text-earth-cream py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="text-xl md:text-2xl font-serif italic font-bold uppercase tracking-widest mb-2">Karisma</div>
            <p className="text-[10px] md:text-xs opacity-60 max-w-xs font-light">Physical and mental well-being for your home & hotel massage needs.</p>
          </div>
          <div className="flex gap-6 md:gap-12 text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-bold opacity-80">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Connect</a>
          </div>
          <div className="text-[8px] md:text-[10px] opacity-40 uppercase tracking-widest">
            © 2026 Karisma Massage Services.
          </div>
        </div>
      </footer>
    </main>
  );
}
