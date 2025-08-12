import { apiRouter } from './routers/api';
import { gameRouter } from './routers/game';
import { router } from './trpc';

export const appRouter = router({
  api: apiRouter,
  game: gameRouter,
});

export type AppRouter = typeof appRouter;
