import ws from '@fastify/websocket';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import { appRouter, type AppRouter, createContext } from '@ll-xq/trpc';
import cors from '@fastify/cors';

export interface ServerOptions {
  dev?: boolean;
  port?: number;
  prefix?: string;
}

export function createServer(opts: ServerOptions) {
  const dev = opts.dev ?? true;
  const port = opts.port ?? 3000;
  const prefix = opts.prefix ?? '/api/trpc';
  const server = fastify({ logger: dev });

  void server.register(cors, {
    origin: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  void server.register(ws);
  void server.register(fastifyTRPCPlugin, {
    prefix,
    useWSS: true,
    trpcOptions: { router: appRouter, createContext },
  });

  // After registering the tRPC plugin, access the WebSocket server
  server.ready(() => {
    if (server.websocketServer) {
      server.websocketServer.on('connection', (ws: any) => {
        console.log('Client connected!');

        ws.on('close', () => {
          console.log('Client disconnected!');
          // Perform any cleanup or state updates related to the disconnected client
        });

        ws.on('error', () => {
          console.error('WebSocket error...');
        });
      });
    }
  });

  server.get('/', async () => {
    return { hello: 'wait-on 💨' };
  });

  const stop = async () => {
    await server.close();
  };
  const start = async () => {
    try {
      await server.listen({ port, host: '0.0.0.0' });
      console.log('listening on port', port);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  return { server, start, stop };
}
