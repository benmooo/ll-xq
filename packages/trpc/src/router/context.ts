import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { AppDependencies } from '../lib/app-dependencies';

export interface User {
  name: string[] | string;
}

export function createContext({ req, res, info }: CreateFastifyContextOptions) {
  const user: User = { name: req.headers.username ?? 'anonymous' };
  const { eventBus, roomManager } = AppDependencies.getInstance();

  return { req, res, user, eventBus, roomManager };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
