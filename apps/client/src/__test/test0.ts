import { createTRPCClient, createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client';
import superjson from 'superjson';
import { type AppRouter } from '@ll-xq/trpc';

async function start() {
  const { port, prefix } = { port: 3000, prefix: '/api/trpc' };
  const urlEnd = `localhost:${port}${prefix}`;

  const wsClient = createWSClient({ url: `ws://${urlEnd}` });
  const trpc = createTRPCClient<AppRouter>({
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

  await new Promise<void>((resolve) => {
    trpc.game.onRoomEvent.subscribe(
      { roomId: 'room-uuid', playerId: 'player-uuid' },
      {
        onData(data) {
          console.log('>>> room-event:', data);
        },
        onError(error) {
          console.error('>>> room-event:error:', error);
          resolve();
        },
        onComplete() {
          resolve();
        },
      },
    );
  });

  // we're done - make sure app closes with a clean exit
  await wsClient.close();
}

void start();
