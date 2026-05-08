import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  
  // Nationality Logic (No bots)
  const nationalities = ['Japan', 'Philippines'] as const;
  const randomNat = nationalities[Math.floor(Math.random() * nationalities.length)];
  
  if (!pusherServer) {
    return new Response('Pusher server not initialized', { status: 500 });
  }

  const presenceData = {
    user_id: userId,
    user_info: {
      name: isStaff ? 'Karisma Support' : `Visitor-${userId.slice(-4)}`,
      avatar: isStaff ? '🧘' : '👤',
      nationality: isStaff ? 'Philippines' : randomNat
    },
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
  return NextResponse.json(authResponse);
}
