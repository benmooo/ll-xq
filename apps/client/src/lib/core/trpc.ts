import type { AppRouter } from '@ll-xq/trpc';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superjson from 'superjson';

const domain = '192.168.1.117';
const { port, prefix } = { port: 3000, prefix: '/api/trpc' };
const urlEnd = `${domain}:${port}${prefix}`;

const wsClient = createWSClient({ url: `ws://${urlEnd}` });
export const trpc = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        if (op.type === 'subscription') return true;
        if (op.path.startsWith('game.')) return true;
        // other mutation/query -- through HTTP
        return false;
      },
      true: wsLink({ client: wsClient, transformer: superjson }),
      false: httpBatchLink({
        url: `http://${urlEnd}`,
        transformer: superjson,
      }),
    }),
  ],
});
