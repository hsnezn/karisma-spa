import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

const appId = process.env.PUSHER_APP_ID;
const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

declare global {
  interface Window {
    __karismaPusherClient?: PusherClient;
  }
}

type PusherAuthParams = { role: 'user' | 'operator'; user_id: string };
type PusherClientWithAuth = PusherClient & {
  config?: { auth?: { params?: PusherAuthParams } };
  options?: { auth?: { params?: PusherAuthParams } };
};

export const pusherServer = (appId && key && secret && cluster)
  ? new PusherServer({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  : null;

const client = (() => {
  if (typeof window === 'undefined' || !key || !cluster) return null;

  if (window.__karismaPusherClient) return window.__karismaPusherClient;

  const created = new PusherClient(key, {
    cluster,
    authEndpoint: '/api/pusher/auth',
    auth: {
      params: {
        role: 'user',
        user_id: '',
      },
    },
  });

  window.__karismaPusherClient = created;
  return created;
})();

export const pusherClient = client;

// Helper to update auth params - simplified for resilience
export const updatePusherAuth = (role: 'user' | 'operator', userId: string) => {
  try {
    if (!pusherClient) return;

    const typed = pusherClient as PusherClientWithAuth;
    const cfg = typed.config;
    if (cfg?.auth?.params) {
      cfg.auth.params.role = role;
      cfg.auth.params.user_id = userId;
    }

    const opts = typed.options;
    if (opts?.auth?.params) {
      opts.auth.params.role = role;
      opts.auth.params.user_id = userId;
    }
  } catch (e) {
    console.error('Pusher auth update failed:', e);
  }
};
