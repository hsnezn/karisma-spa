'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ChatRoom from '@/components/ChatRoom';
import { pusherClient, updatePusherAuth } from '@/lib/pusher';

interface User {
  id: string;
  name: string;
  avatar: string;
  nationality?: string;
}

interface VisitorSessionInfo {
  id: string;
  name: string;
  avatar: string;
  nationality?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  isOnline: boolean;
  totalMessages: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'operator';
  timestamp: Date;
}

type StoredSession = { user: string; role: 'user' | 'operator' };
type StoredUser = { user: string; pass: string; role: 'user' | 'operator' };

const readSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('karisma_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as { user?: unknown; role?: unknown };
    if (typeof p.user !== 'string') return null;
    if (p.role !== 'user' && p.role !== 'operator') return null;
    return { user: p.user, role: p.role };
  } catch {
    return null;
  }
};

const defaultUsers: StoredUser[] = [
  { user: 'staff_admin', pass: 'karisma2026', role: 'operator' },
  { user: 'guest_user', pass: 'welcome', role: 'user' },
];

const readUsers = (): StoredUser[] => {
  if (typeof window === 'undefined') return defaultUsers;
  try {
    const raw = localStorage.getItem('karisma_users');
    if (!raw) return defaultUsers;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultUsers;
    const normalized: StoredUser[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const u = item as { user?: unknown; pass?: unknown; role?: unknown };
      if (typeof u.user !== 'string' || typeof u.pass !== 'string') continue;
      if (u.role !== 'user' && u.role !== 'operator') continue;
      normalized.push({ user: u.user, pass: u.pass, role: u.role });
    }
    return normalized.length ? normalized : defaultUsers;
  } catch {
    return defaultUsers;
  }
};

const readVisitorSessions = (): Record<string, VisitorSessionInfo> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('karisma_visitor_sessions');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const obj = parsed as Record<string, unknown>;
    const normalized: Record<string, VisitorSessionInfo> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<VisitorSessionInfo>;
      if (typeof v.id !== 'string' || v.id !== key) continue;
      if (typeof v.name !== 'string' || typeof v.avatar !== 'string') continue;
      if (typeof v.firstSeenAt !== 'number' || typeof v.lastSeenAt !== 'number') continue;
      if (typeof v.isOnline !== 'boolean' || typeof v.totalMessages !== 'number') continue;
      normalized[key] = {
        id: v.id,
        name: v.name,
        avatar: v.avatar,
        nationality: typeof v.nationality === 'string' ? v.nationality : undefined,
        firstSeenAt: v.firstSeenAt,
        lastSeenAt: v.lastSeenAt,
        isOnline: v.isOnline,
        totalMessages: v.totalMessages,
      };
    }
    return normalized;
  } catch {
    return {};
  }
};

const formatDuration = (ms: number) => {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

type PresenceMemberInfo = { name: string; avatar: string; nationality?: User['nationality'] };
type PresenceMember = { id: string; info: PresenceMemberInfo };
type PresenceMembers = { myID: string; each: (cb: (member: PresenceMember) => void) => void };

type OperatorMessagePayload = {
  id: string;
  text: string;
  sender: Message['sender'];
  timestamp: string | number | Date;
  guestId: string;
};

type ChatMessagePayload = {
  id: string;
  text: string;
  sender: Message['sender'];
  timestamp?: string | number | Date;
};

const isOperatorMessagePayload = (data: unknown): data is OperatorMessagePayload => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.guestId !== 'string' || !d.guestId) return false;
  if (typeof d.id !== 'string' || typeof d.text !== 'string') return false;
  if (d.sender !== 'user' && d.sender !== 'operator') return false;
  return true;
};

const isChatMessagePayload = (data: unknown): data is ChatMessagePayload => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.text !== 'string') return false;
  if (d.sender !== 'user' && d.sender !== 'operator') return false;
  return true;
};

export default function Home() {
  const [myId, setMyId] = useState<string | null>(null);
  const [persistentVId, setPersistentVId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardNow, setDashboardNow] = useState(0);
  const [visitorSessions, setVisitorSessions] = useState<Record<string, VisitorSessionInfo>>({});
  const visitorSessionsRef = React.useRef<Record<string, VisitorSessionInfo>>({});

  const handleNewMessage = useCallback((userId: string, msg: Message) => {
    setChatHistory(prev => {
      const existing = prev[userId] || [];
      if (existing.some(m => m.id === msg.id)) return prev;
      return {
        ...prev,
        [userId]: [...existing, msg],
      };
    });
  }, []);
  const [activeVisitors, setActiveVisitors] = useState<User[]>([]);
  const activeVisitorsRef = React.useRef<User[]>([]);
  const selectedUserRef = React.useRef<User | null>(null);

  useEffect(() => {
    activeVisitorsRef.current = activeVisitors;
  }, [activeVisitors]);

  useEffect(() => {
    visitorSessionsRef.current = visitorSessions;
  }, [visitorSessions]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  const [loginView, setLoginView] = useState<'none' | 'user' | 'operator' | 'create-account'>('none');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'operator' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showStaffField, setShowStaffField] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    setTimeout(() => {
      setIsLoggedIn(true);
      setUserRole(session.role);
      setUsername(session.user);
      setShowDashboard(session.role === 'operator');
    }, 0);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userRole !== 'operator') return;
    const loaded = readVisitorSessions();
    setTimeout(() => setVisitorSessions(loaded), 0);
  }, [userRole]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userRole !== 'operator') return;
    localStorage.setItem('karisma_visitor_sessions', JSON.stringify(visitorSessions));
  }, [userRole, visitorSessions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userRole !== 'operator' || !showDashboard) return;
    const tick = () => setDashboardNow(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [showDashboard, userRole]);

  // PERSISTENT VISITOR ID & PUSHER INIT
  useEffect(() => {
    try {
      if (!pusherClient) return;

      let vId = localStorage.getItem('karisma_visitor_id');
    if (!vId) {
      vId = `user-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('karisma_visitor_id', vId);
    }
    const nextPersistentId = vId;
    setTimeout(() => setPersistentVId(nextPersistentId), 0);

    // Update auth role and ID before subscribing
      if (typeof updatePusherAuth === 'function') {
        updatePusherAuth(userRole || 'user', userRole === 'operator' ? 'staff-main' : vId);
      }

      pusherClient.unsubscribe('presence-visitors');
      pusherClient.unsubscribe('private-operator');
      const channel = pusherClient.subscribe('presence-visitors');

      const onSucceeded = (members: PresenceMembers) => {
        setMyId(members.myID);
        if (userRole === 'operator') {
          const now = Date.now();
          const membersList: User[] = [];
          const presentIds = new Set<string>();
          members.each((member: PresenceMember) => {
            if (member.id !== 'staff-main') {
              membersList.push({
                id: member.id,
                name: member.info.name,
                avatar: member.info.avatar,
                nationality: member.info.nationality
              });
              presentIds.add(member.id);
            }
          });
          setActiveVisitors(membersList);
          setVisitorSessions(prev => {
            const merged: Record<string, VisitorSessionInfo> = {};
            for (const [id, session] of Object.entries(prev)) {
              merged[id] = presentIds.has(id)
                ? { ...session, isOnline: true, lastSeenAt: now }
                : { ...session, isOnline: false, lastSeenAt: session.isOnline ? now : session.lastSeenAt };
            }
            for (const visitor of membersList) {
              const existing = merged[visitor.id];
              merged[visitor.id] = {
                id: visitor.id,
                name: visitor.name,
                avatar: visitor.avatar,
                nationality: visitor.nationality,
                firstSeenAt: existing?.firstSeenAt ?? now,
                lastSeenAt: now,
                isOnline: true,
                totalMessages: existing?.totalMessages ?? 0,
              };
            }
            return merged;
          });
        }
      };

      const onMemberAdded = (member: PresenceMember) => {
        if (member.id === 'staff-main') return;
        const now = Date.now();
        setActiveVisitors(prev => {
          if (prev.find(m => m.id === member.id)) return prev;
          return [...prev, {
            id: member.id,
            name: member.info.name,
            avatar: member.info.avatar,
            nationality: member.info.nationality
          }];
        });
        setVisitorSessions(prev => {
          const existing = prev[member.id];
          return {
            ...prev,
            [member.id]: {
              id: member.id,
              name: member.info.name,
              avatar: member.info.avatar,
              nationality: member.info.nationality,
              firstSeenAt: existing?.firstSeenAt ?? now,
              lastSeenAt: now,
              isOnline: true,
              totalMessages: existing?.totalMessages ?? 0,
            },
          };
        });
      };

      const onMemberRemoved = (member: PresenceMember) => {
        setActiveVisitors(prev => prev.filter(m => m.id !== member.id));
        const now = Date.now();
        setVisitorSessions(prev => {
          const existing = prev[member.id];
          if (!existing) return prev;
          return {
            ...prev,
            [member.id]: { ...existing, isOnline: false, lastSeenAt: now },
          };
        });
      };

      channel.bind('pusher:subscription_succeeded', onSucceeded);

      if (userRole === 'operator') {
        channel.bind('pusher:member_added', onMemberAdded);
        channel.bind('pusher:member_removed', onMemberRemoved);

        const operatorChannel = pusherClient.subscribe('private-operator');
        const onOperatorMessage = (data: unknown) => {
          if (!isOperatorMessagePayload(data)) return;
          const now = Date.now();

          const msg: Message = {
            id: data.id,
            text: data.text,
            sender: data.sender,
            timestamp: new Date(data.timestamp || Date.now()),
          };

          handleNewMessage(data.guestId, msg);
          setVisitorSessions(prev => {
            const existing = prev[data.guestId];
            const fallback = activeVisitorsRef.current.find(v => v.id === data.guestId);
            const baseName = fallback?.name || `Visitor-${data.guestId.slice(-4)}`;
            const baseAvatar = fallback?.avatar || '/icons/avatar-user.png';
            const baseNat = fallback?.nationality;
            const next: VisitorSessionInfo = {
              id: data.guestId,
              name: existing?.name || baseName,
              avatar: existing?.avatar || baseAvatar,
              nationality: existing?.nationality || baseNat,
              firstSeenAt: existing?.firstSeenAt ?? now,
              lastSeenAt: now,
              isOnline: existing?.isOnline ?? true,
              totalMessages: (existing?.totalMessages ?? 0) + 1,
            };
            return { ...prev, [data.guestId]: next };
          });

          if (!selectedUserRef.current) {
            const visitor = activeVisitorsRef.current.find(v => v.id === data.guestId) || {
              id: data.guestId,
              name: `Visitor-${data.guestId.slice(-4)}`,
              avatar: '/icons/avatar-user.png',
            };
            setSelectedUser(visitor);
          }
        };

        operatorChannel.bind('new-message', onOperatorMessage);
      }
    } catch (err) {
      console.error('Pusher connection error:', err);
    }

    return () => {
      try {
        if (pusherClient) {
          const channel = pusherClient.channel('presence-visitors');
          if (channel) {
            channel.unbind('pusher:subscription_succeeded');
            channel.unbind('pusher:member_added');
            channel.unbind('pusher:member_removed');
          }
          pusherClient.unsubscribe('presence-visitors');

          const operatorChannel = pusherClient.channel('private-operator');
          if (operatorChannel) {
            operatorChannel.unbind('new-message');
          }
          pusherClient.unsubscribe('private-operator');
        }
      } catch {}
    };
  }, [handleNewMessage, userRole]);

  useEffect(() => {
    if (!pusherClient) return;
    if (userRole === 'operator') return;
    if (selectedUser) return;

    const visitorId = myId || persistentVId;
    if (!visitorId) return;

    const channelName = `private-chat-${visitorId}`;
    const channel = pusherClient.subscribe(channelName);

    const onIncoming = (data: unknown) => {
      if (!isChatMessagePayload(data)) return;

      const msg: Message = {
        id: data.id,
        text: data.text,
        sender: data.sender,
        timestamp: new Date(data.timestamp || Date.now()),
      };

      handleNewMessage(visitorId, msg);

      if (data.sender === 'operator') {
        setSelectedUser({ id: 'staff-main', name: 'Karisma Support', avatar: '/icons/avatar-staff.png' });
      }
    };

    channel.bind('new-message', onIncoming);

    return () => {
      if (pusherClient) {
        channel.unbind('new-message', onIncoming);
        pusherClient.unsubscribe(channelName);
      }
    };
  }, [handleNewMessage, myId, persistentVId, selectedUser, userRole]);

  const [registeredUsers, setRegisteredUsers] = useState<StoredUser[]>(defaultUsers);
  const [usersLoaded, setUsersLoaded] = useState(false);

  useEffect(() => {
    const users = readUsers();
    setTimeout(() => {
      setRegisteredUsers(users);
      setUsersLoaded(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!usersLoaded) return;
    localStorage.setItem('karisma_users', JSON.stringify(registeredUsers));
  }, [registeredUsers, usersLoaded]);

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

  const dashboardSessions = userRole === 'operator' ? Object.values(visitorSessions) : [];
  const totalVisitorsCount = userRole === 'operator' ? dashboardSessions.length : activeVisitors.length;
  const liveChatsCount = userRole === 'operator'
    ? dashboardSessions.filter(s => s.isOnline && (chatHistory[s.id]?.length || 0) > 0).length
    : 0;
  const avgTimeMs = userRole === 'operator' && dashboardSessions.length
    ? Math.round(
        dashboardSessions.reduce((sum, s) => {
          const end = s.isOnline ? dashboardNow : s.lastSeenAt;
          return sum + Math.max(0, end - s.firstSeenAt);
        }, 0) / dashboardSessions.length
      )
    : 0;
  const conversionPct = userRole === 'operator' && dashboardSessions.length
    ? Math.round((dashboardSessions.filter(s => s.totalMessages > 0).length / dashboardSessions.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-earth-cream text-earth-dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-earth-light">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="text-base md:text-2xl font-elegant italic text-earth-dark font-bold tracking-tight uppercase leading-none">
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-earth-dark/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-earth-light">
            <h3 className="text-2xl font-elegant text-earth-dark mb-6 text-center">
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
            <section className="relative h-[72vh] md:h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/20 z-10" />
                <img src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=2070" alt="Hero" className="w-full h-full object-cover opacity-90 anim-kenburns" />
              </div>
              <div className="relative z-20 text-white space-y-6 md:space-y-8">
                <h1 className="text-3xl sm:text-4xl md:text-8xl font-elegant leading-tight">Find your <span className="italic font-light">bliss</span></h1>
                <button className="border border-white px-8 md:px-12 py-3.5 text-[10px] md:text-sm tracking-widest font-light hover:bg-white hover:text-earth-dark transition-all uppercase">Book Your Escape</button>
              </div>
            </section>

            {/* BEYOND BLISSED */}
            <section className="bg-earth-dark text-earth-cream py-14 md:py-16 px-5 md:px-20 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
              <div className="space-y-6 max-w-xl">
                <h2 className="text-3xl md:text-5xl font-elegant">Beyond <span className="italic font-light">blissed</span></h2>
                <p className="opacity-90 leading-relaxed text-justified">At Karisma, we believe that physical and mental well-being go hand in hand. We offer great relaxation deep within at your own comfort place.</p>
              </div>
              <div className="flex flex-col gap-4">
                <img src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" className="rounded-sm shadow-2xl h-48 object-cover anim-fade-up hover:scale-[1.02] transition-transform duration-700" alt="Spa" />
                <img src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800" className="rounded-sm shadow-2xl h-48 object-cover self-end -mt-12 w-[80%] anim-fade-up anim-delay-150 anim-float hover:scale-[1.02] transition-transform duration-700" alt="Spa" />
              </div>
            </section>

            {/* MENU */}
            <section className="bg-earth-light py-14 md:py-16 px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-elegant text-earth-dark mb-10">Blissful Karisma Menu</h2>
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: 'Nuru', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Yoni', img: 'https://images.unsplash.com/photo-1612110186545-798d9b96a40f?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Relaxation', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Best', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=400' },
                  { name: 'Combo', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=400' }
                ].map((item, i) => (
                  <div key={i} className={`relative aspect-square group cursor-pointer overflow-hidden border-4 border-white shadow-xl anim-fade-up ${
                    i % 5 === 1 ? 'anim-delay-150' : i % 5 === 2 ? 'anim-delay-300' : i % 5 === 3 ? 'anim-delay-450' : i % 5 === 4 ? 'anim-delay-600' : ''
                  }`}>
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover anim-kenburns group-hover:scale-110 group-hover:rotate-[0.5deg] transition-transform duration-700" />
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
          <div className="max-w-6xl mx-auto py-6 md:py-12 px-4 md:px-6">
            <div className="mb-6 md:mb-12 border-b border-earth-light pb-5 md:pb-6">
              <h2 className="text-2xl md:text-3xl font-elegant text-earth-dark uppercase tracking-widest">Visitor Tracking</h2>
              <p className="text-earth-mid text-xs md:text-sm italic">Real-time visitor insights and engagement (SalesIQ style).</p>
            </div>
            <div className="bg-white rounded-3xl p-4 md:p-8 shadow-2xl border border-earth-light min-h-[500px]">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-earth-cream/50 px-3 py-1.5 rounded-full shadow-sm border border-earth-light">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-earth-dark text-[10px] font-bold uppercase tracking-widest font-mono">Live Visitors (Global)</span>
                  </div>
                </div>
                <div className="text-earth-mid text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                  <span>Showing {activeVisitors.length}</span>
                </div>
              </div>
              
              <div className="grid gap-4">
                {activeVisitors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 md:py-20 text-earth-mid italic">
                    <p>No active visitors.</p>
                  </div>
                ) : (
                  activeVisitors.map((visitor) => (
                    <div key={visitor.id} className="group bg-earth-cream/20 hover:bg-earth-cream/40 p-4 md:p-6 rounded-2xl border border-earth-light transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-earth-dark shadow-lg overflow-hidden shrink-0">
                          <img src={visitor.avatar} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-elegant text-base md:text-lg text-earth-dark font-bold truncate">{visitor.name}</h4>
                          <div className="flex gap-3 text-[10px] uppercase font-bold tracking-widest text-earth-mid items-center">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online</span>
                            <span>•</span>
                            <span>Country: {visitor.nationality || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(visitor)}
                        className="bg-earth-dark text-white px-6 py-3 rounded-full text-xs font-bold shadow-md hover:bg-accent-brown transition-all active:scale-95 w-full sm:w-auto"
                      >
                        Initiate Chat
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { label: 'Total Visitors', val: totalVisitorsCount.toString(), color: 'text-earth-dark' },
                  { label: 'Live Chats', val: liveChatsCount.toString(), color: 'text-emerald-600' },
                  { label: 'Avg Time', val: formatDuration(avgTimeMs), color: 'text-amber-600' },
                  { label: 'Conversion', val: `${conversionPct}%`, color: 'text-blue-600' }
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
        <div className="fixed bottom-5 right-5 z-[100]">
          <button onClick={() => setSelectedUser({ id: 'staff-main', name: 'Karisma Support', avatar: '/icons/avatar-staff.png' })} className="bg-earth-dark text-white p-3.5 rounded-full shadow-2xl hover:scale-110 transition-transform border-4 border-white flex items-center gap-2 group">
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap text-xs md:text-sm font-bold uppercase tracking-widest px-0 group-hover:px-2">Chat</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
      )}

      {/* Chat Room */}
      {selectedUser && (() => {
        const visitorId = myId || persistentVId || '';
        const conversationId = userRole === 'operator' ? selectedUser.id : visitorId;
        return (
          <ChatRoom 
            key={conversationId}
            user={selectedUser} 
            myId={userRole === 'operator' ? 'staff-main' : visitorId} 
            onClose={() => setSelectedUser(null)}
            initialMessages={chatHistory[conversationId] || []}
            onNewMessage={(msg) => handleNewMessage(conversationId, msg)}
          />
        );
      })()}

      {/* Footer */}
      <footer className="bg-earth-dark text-earth-cream py-16 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-2xl font-elegant italic font-bold uppercase tracking-widest mb-4">Karisma</div>
          <p className="text-xs opacity-60 mb-8 max-w-md mx-auto text-justified">Physical and mental well-being for your home & hotel massage needs.</p>
          <div className="text-[10px] opacity-40 uppercase tracking-widest">© 2026 Karisma Massage Services.</div>
        </div>
      </footer>
    </main>
  );
}
