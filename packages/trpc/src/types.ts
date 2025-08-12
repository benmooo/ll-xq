import type { Xiangqi } from '@ll-xq/game-core';

export type Player = {
  id: string;
  name: string;
  side: 'r' | 'b';
};

export type Room = {
  id: string;
  players: Player[];
  state: Xiangqi;
  createdAt: number;
  createdBy: string;
};
