export { createXiangqi } from './src/cc.js';
export * from './src/game-event.js';

import type { createXiangqi } from './src/cc.js';
export type Xiangqi = ReturnType<typeof createXiangqi>;
