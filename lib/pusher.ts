import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const pusherServer = (appId && key && secret && cluster)
  ? new PusherServer({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  : null;

export const pusherClient = (typeof window !== 'undefined' && key && cluster)
  ? new PusherClient(key, {
      cluster,
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
