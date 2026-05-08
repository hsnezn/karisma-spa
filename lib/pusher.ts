import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const pusherClient = typeof window !== 'undefined' 
  ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: {
          role: 'user',
          user_id: ''
        }
      }
    })
  : null;

// Helper to update auth params
export const updatePusherAuth = (role: 'user' | 'operator', userId: string) => {
  if (pusherClient) {
    (pusherClient.config as any).auth.params.role = role;
    (pusherClient.config as any).auth.params.user_id = userId;
  }
};
