import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const countryCache = new Map<string, { value: string; expiresAt: number }>();

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
};

const fetchCountryName = async (ip: string) => {
  const now = Date.now();
  const cached = countryCache.get(ip);
  if (cached && cached.expiresAt > now) return cached.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_name/`, {
      signal: controller.signal,
      headers: { accept: 'text/plain' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    countryCache.set(ip, { value: text, expiresAt: now + 1000 * 60 * 30 });
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id');
  const channelName = params.get('channel_name');

  if (!socketId || !channelName) {
    return new Response('Missing socket_id or channel_name', { status: 400 });
  }

  // Check if this is a staff member or a visitor with a persistent ID
  const bodyParams = Object.fromEntries(params.entries());
  const isStaff = bodyParams.role === 'operator';
  const providedUserId = bodyParams.user_id;
  
  // Use provided ID if available, otherwise fallback to staff or new random
  const userId = providedUserId || (isStaff ? 'staff-main' : `user-${Math.random().toString(36).substr(2, 9)}`);
  
  if (!pusherServer) {
    return new Response('Pusher server not initialized', { status: 500 });
  }

  if (channelName.startsWith('presence-')) {
    const ip = getClientIp(req);
    const countryName = !isStaff && ip ? await fetchCountryName(ip) : null;
    const presenceData = {
      user_id: userId,
      user_info: {
        name: isStaff ? 'Karisma Support' : `Visitor-${userId.slice(-4)}`,
        avatar: isStaff ? '/icons/avatar-staff.png' : '/icons/avatar-user.png',
        nationality: countryName || 'Unknown',
      },
    };

    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
