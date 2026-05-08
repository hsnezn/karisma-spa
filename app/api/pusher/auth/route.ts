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

  // Generate a random user ID for anonymous visitors if not logged in
  const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
  
  const presenceData = {
    user_id: userId,
    user_info: {
      name: `Visitor-${userId.slice(-4)}`,
      avatar: '👤'
    },
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
  return NextResponse.json(authResponse);
}
