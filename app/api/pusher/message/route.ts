import { pusherServer } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { id, text, sender, channelName, guestId: providedGuestId } = await req.json();

    if (!pusherServer) {
      return NextResponse.json({ error: 'Pusher server not initialized' }, { status: 500 });
    }

    if (typeof channelName !== 'string' || !channelName.startsWith('private-chat-')) {
      return NextResponse.json({ error: 'Invalid channelName' }, { status: 400 });
    }

    const guestId = (typeof providedGuestId === 'string' && providedGuestId.length > 0)
      ? providedGuestId
      : channelName.slice('private-chat-'.length);

    if (!guestId || channelName !== `private-chat-${guestId}`) {
      return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
    }

    // Use the ID passed from the client, or generate a fallback
    const messagePayload = {
      id: id || Date.now().toString(),
      text,
      sender,
      timestamp: new Date().toISOString(),
    };

    await pusherServer.trigger(channelName, 'new-message', messagePayload);
    await pusherServer.trigger('private-operator', 'new-message', { ...messagePayload, guestId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
