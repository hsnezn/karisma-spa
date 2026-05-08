import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, sender, userId, channelName } = await req.json();

    await pusherServer.trigger(channelName, 'new-message', {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
