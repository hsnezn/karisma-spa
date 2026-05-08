import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text, sender, userId, channelName } = await req.json();

    if (!pusherServer) {
      return NextResponse.json({ error: 'Pusher server not initialized' }, { status: 500 });
    }

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
