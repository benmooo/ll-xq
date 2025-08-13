import type { Xiangqi } from '@ll-xq/game-core';

export type Player = {
  id: string;
  name: string;
  side: 'r' | 'b';
  online: boolean;
  lastActiveAt: number;
};

export type Room = {
  id: string;
  players: Map<string, Player>;
  state: Xiangqi;
  createdAt: number;
  createdBy: string;
};
