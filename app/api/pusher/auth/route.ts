import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id');
  const channelName = params.get('channel_name');

  if (!socketId || !channelName) {
    return new Response('Missing socket_id or channel_name', { status: 400 });
  }

  // Check if this is a staff member based on a custom header or param
  // For now, we'll check if the name 'staff_admin' is passed or use a simple logic
  const bodyParams = Object.fromEntries(params.entries());
  const isStaff = bodyParams.role === 'operator';
  
  const userId = isStaff ? 'staff-main' : `user-${Math.random().toString(36).substr(2, 9)}`;
  
  // For demonstration, assign a random nationality
  const nationalities = ['Japan', 'Philippines'] as const;
  const randomNat = nationalities[Math.floor(Math.random() * nationalities.length)];
  
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
