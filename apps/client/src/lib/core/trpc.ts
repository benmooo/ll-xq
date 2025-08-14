import type { AppRouter } from '@ll-xq/trpc';
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superjson from 'superjson';

const apiEndpoint = process.env.LLXQ_SERVER_URL || 'http://localhost:3000';
const prefix = '/api/trpc';
const urlEnd = `${apiEndpoint}${prefix}`;

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
