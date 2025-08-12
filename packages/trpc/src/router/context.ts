import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { MemoryEventBus } from './ee';
import { RoomManager } from '../room-manager';

export interface User {
  name: string[] | string;
}

export function createContext({ req, res, info }: CreateFastifyContextOptions) {
  const user: User = { name: req.headers.username ?? 'anonymous' };
  const eventBus = new MemoryEventBus();

  const roomManager = new RoomManager();

  return { req, res, user, eventBus, roomManager };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
