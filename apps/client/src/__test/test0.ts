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
          if (op.type === 'mutation' && op.path.startsWith('game.')) return true;
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

  const version = await trpc.api.version.query();
  console.log('>>> anon:version:', version);

  const hello = await trpc.api.hello.query({ username: 'John' });
  console.log('>>> anon:hello:', hello);

  await new Promise<void>((resolve) => {
    trpc.game.onRoomEvent.subscribe(
      { roomId: 'room-uuid' },
      {
        onData(data) {},
        onError(error) {},
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
