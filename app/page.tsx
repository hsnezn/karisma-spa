'use client';

import React, { useState } from 'react';
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

  // Simulated User Database
  const [registeredUsers, setRegisteredUsers] = useState([
    { user: 'staff_admin', pass: 'karisma2026', role: 'operator' },
    { user: 'guest_user', pass: 'welcome', role: 'user' }
  ]);

  const handleLogin = (role: 'user' | 'operator') => {
    const user = registeredUsers.find(u => u.user === username && u.pass === password && u.role === role);

    if (user) {
      setIsLoggedIn(true);
      setUserRole(role);
      setLoginView('none');
      setError('');
      if (role === 'operator') setShowDashboard(true);
    } else {
      setError(`Invalid credentials for ${role} login.`);
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
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setShowDashboard(false);
    setUsername('');
    setPassword('');
    setInviteCode('');
    setShowStaffField(false);
  };

  return (
    <main className="min-h-screen bg-earth-cream text-earth-dark font-sans">
      {/* Navigation */}
      <nav className="fixed w-full z-40 bg-white/90 backdrop-blur-md border-b border-earth-light">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-serif italic text-earth-dark font-bold tracking-tight uppercase">
            Karisma Home & Hotel <br className="hidden md:block" />
            <span className="text-sm font-normal normal-case block -mt-1">Massage Services</span>
          </div>
          <div className="flex gap-4">
            {!isLoggedIn ? (
              <>
                <button 
                  onClick={() => { setLoginView('create-account'); setError(''); }}
                  className="text-earth-dark text-sm font-bold hover:text-accent-brown"
                >
                  Create Account
                </button>
                <button 
                  onClick={() => { setLoginView('user'); setError(''); }}
                  className="text-earth-dark text-sm font-bold hover:text-accent-brown border-2 border-earth-dark px-4 py-2 rounded-full"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setLoginView('operator'); setError(''); }}
                  className="bg-earth-dark text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-accent-brown transition-all shadow-lg"
                >
                  Staff Portal
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm italic">Welcome, {userRole === 'operator' ? 'Staff' : username}</span>
                {userRole === 'operator' && (
                  <button onClick={() => setShowDashboard(!showDashboard)} className="text-sm font-bold underline">
                    {showDashboard ? 'View Site' : 'View Map'}
                  </button>
                )}
                <button onClick={handleLogout} className="text-earth-mid text-sm font-semibold hover:text-earth-dark">Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Login Overlay */}
      {loginView !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-earth-dark/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 border border-earth-light">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif text-earth-dark mb-2">
                {loginView === 'operator' ? 'Staff Portal' : 
                 loginView === 'create-account' ? 'Create Your Account' : 'Welcome Back'}
              </h3>
              <p className="text-earth-mid text-sm italic">Experience the Karisma Bliss</p>
            </div>
            
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl border border-red-200 font-bold animate-pulse">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-earth-dark uppercase mb-1">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark font-bold" />
              </div>
              <div>
                <label className="block text-xs font-black text-earth-dark uppercase mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark font-bold" />
              </div>

              {loginView === 'create-account' && (
                <div className="pt-2">
                  {!showStaffField ? (
                    <button onClick={() => setShowStaffField(true)} className="text-[10px] text-earth-light hover:text-earth-dark transition-colors uppercase tracking-widest font-bold">Are you staff? Click here</button>
                  ) : (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs font-bold text-earth-dark uppercase mb-1">Staff Invite Code</label>
                      <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Enter secret code" className="w-full px-4 py-3 bg-earth-cream rounded-xl border-2 border-earth-light focus:ring-2 focus:ring-earth-dark outline-none text-earth-dark" />
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => { if (loginView === 'create-account') handleCreateAccount(); else handleLogin(loginView as 'user' | 'operator'); }} className="w-full bg-earth-dark text-white py-4 rounded-xl font-bold hover:bg-accent-brown transition-all mt-4 uppercase tracking-widest">
                {loginView === 'create-account' ? 'Create Account' : 'Sign In'}
              </button>
              <button onClick={() => { setLoginView('none'); setShowStaffField(false); setInviteCode(''); }} className="w-full text-earth-mid text-sm hover:text-earth-dark transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-20">
        {!showDashboard ? (
          <div className="relative">
            {/* HERO SECTION - MATCHING IMAGE */}
            <section className="relative h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=2070" 
                  alt="Massage Hero" 
                  className="w-full h-full object-cover grayscale-[20%]"
                />
              </div>
              
              <div className="relative z-20 text-white space-y-12">
                <h1 className="text-6xl md:text-8xl font-serif leading-tight">
                  Find your <span className="italic font-light">bliss</span>
                </h1>
                <button className="bg-transparent border border-white px-12 py-3 text-sm tracking-[0.2em] font-light hover:bg-white hover:text-earth-dark transition-all uppercase">
                  Book Your Escape
                </button>
              </div>
            </section>

            {/* BEYOND BLISSED SECTION - MATCHING IMAGE */}
            <section className="bg-earth-dark text-earth-cream py-24 px-6 md:px-20 grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 max-w-xl">
                <h2 className="text-4xl md:text-5xl font-serif">
                  Beyond <span className="italic font-light">Blissed</span>
                </h2>
                <p className="text-lg leading-relaxed font-light opacity-90">
                  At Karisma, we believe that physical and mental well-being go hand in hand. We don't just offer a brief escape from the daily grind; we offer great relaxation deep within. When you regularly make time for yourself, your bliss can bless every part of your life with more energy and peace at your own comfort place.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" 
                  alt="Stones Massage" 
                  className="rounded-sm shadow-2xl h-64 w-full object-cover"
                />
                <img 
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800" 
                  alt="Spa Flower" 
                  className="rounded-sm shadow-2xl h-64 w-full object-cover ml-12 -mt-12"
                />
              </div>
            </section>

            {/* MENU SECTION - MATCHING IMAGE */}
            <section className="bg-earth-light py-24 px-6 text-center">
              <h2 className="text-4xl font-serif text-earth-dark mb-16">Blissful Karisma Menu</h2>
              
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { name: 'Nuru Massage', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Yoni Massage', img: 'https://images.unsplash.com/photo-1612110186545-798d9b96a40f?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Deep Relaxation', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Best Massage', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Combination', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400' }
                ].map((item, i) => (
                  <div key={i} className="relative aspect-square group cursor-pointer overflow-hidden shadow-xl border-4 border-white">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <span className="text-white text-xs font-bold uppercase tracking-widest text-center leading-tight drop-shadow-md">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-24 space-y-12">
                <h2 className="text-4xl md:text-5xl font-serif text-earth-dark underline underline-offset-8 decoration-earth-mid">
                  Book Your Escape Now!<br />Connect With Us.
                </h2>
                
                <div className="space-y-6 text-2xl md:text-3xl font-black text-earth-dark">
                  <p className="flex items-center justify-center gap-3">
                    <span className="text-earth-mid text-sm uppercase tracking-widest font-bold">Viber</span> 
                    09104314293
                  </p>
                  <p className="flex items-center justify-center gap-3">
                    <span className="text-earth-mid text-sm uppercase tracking-widest font-bold">Whatsapp</span> 
                    09104314293
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* DASHBOARD VIEW */
          <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-12 flex justify-between items-end border-b border-earth-light pb-6">
              <div>
                <h2 className="text-3xl font-serif text-earth-dark mb-2 uppercase tracking-widest">Operator Radar</h2>
                <p className="text-earth-mid italic font-light italic">Managing bliss across branches in real-time.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-earth-light mb-1">Secret Staff Code</p>
                <code className="bg-earth-dark text-white px-3 py-1 rounded text-xs">KARISMA-STAFF-2026</code>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-2xl relative overflow-hidden border border-earth-light">
              <div className="absolute top-8 right-8 z-50 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-earth-light">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-earth-dark text-[10px] font-bold uppercase tracking-widest font-mono">Live Tracker</span>
              </div>
              
              <Radar onUserClick={(user) => setSelectedUser(user)} />
              
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Active Sessions', val: '12', color: 'text-earth-dark' },
                  { label: 'Available Staff', val: '8', color: 'text-emerald-600' },
                  { label: 'Pending Bookings', val: '5', color: 'text-amber-600' },
                  { label: 'System Load', val: 'Optimal', color: 'text-blue-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-earth-cream/30 p-4 rounded-2xl border border-earth-light">
                    <p className="text-earth-mid text-[10px] uppercase font-bold tracking-widest mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.val}</p>
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
      <footer className="bg-earth-dark text-earth-cream py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
          <div>
            <div className="text-2xl font-serif italic font-bold uppercase tracking-widest mb-2">Karisma</div>
            <p className="text-xs opacity-60 max-w-xs font-light">Physical and mental well-being for your home & hotel massage needs.</p>
          </div>
          <div className="flex gap-12 text-[10px] uppercase tracking-[0.2em] font-bold opacity-80">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Connect</a>
          </div>
          <div className="text-[10px] opacity-40 uppercase tracking-widest">
            © 2026 Karisma Massage Services.
          </div>
        </div>
      </footer>
    </main>
  );
}
