import type { Player, Room } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createXiangqi } from '@ll-xq/game-core';
import * as E from 'fp-ts/Either';
import { either } from 'fp-ts';

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private timeoutMs: number = 60 * 1000,
    private destroyDelayMs: number = 60 * 2 * 1000,
  ) {
    // 定时扫描玩家是否掉线
    const interval = setInterval(() => this.scanRooms(), 10 * 1000);
    console.log('RoomManager initialized');
  }

  createRoom(creatorName: string) {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      players: new Map<string, Player>(),
      state: createXiangqi(),
      createdAt: Date.now(),
      createdBy: creatorName,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoomPlayer(roomId: string, playerName: string, playerId?: string): E.Either<string, Player> {
    const room = this.rooms.get(roomId);
    if (!room) return either.left('Room not found');

    if (playerId && room.players.has(playerId)) {
      const player = room.players.get(playerId)!;
      console.log('player already in room:', player);
      player.online = true;
      player.lastActiveAt = Date.now();
      return either.right(player);
    }

    if (room.players.size >= 2) return either.left('Room is full');

    const id = uuidv4();
    const player: Player = {
      id,
      name: playerName,
      side: room.players.size === 0 ? 'r' : 'b',
      online: true,
      lastActiveAt: Date.now(),
    };
    room.players.set(id, player);

    return either.right(player);
  }

  markPlayerOffline(roomId: string, playerId: string) {
    const player = this.rooms.get(roomId)?.players.get(playerId);
    if (!player) return;
    player.online = false;
  }

  markPlayerOnline(roomId: string, playerId: string) {
    const player = this.rooms.get(roomId)?.players.get(playerId);
    if (!player) return;
    player.online = true;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string) {
    return this.rooms.delete(roomId);
  }

  listRooms() {
    return Array.from(this.rooms.values());
  }

  ping(roomId: string, playerId: string) {
    const player = this.rooms.get(roomId)?.players.get(playerId);
    if (player) {
      player.lastActiveAt = Date.now();
      player.online = true;
    }
  }

  private scanRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      console.log(
        'room players:',
        room.players
          .values()
          .map((player) => ({ id: player.id, side: player.side }))
          .toArray(),
      );
      for (const [playerId, player] of room.players) {
        if (now - player.lastActiveAt > this.timeoutMs) {
          console.log('player offline:', player.id, player.side);
          player.online = false;
        }
      }

      const allOffline = room.players
        .entries()
        .every(([_, p]) => !p.online && now - p.lastActiveAt > this.destroyDelayMs);
      if (allOffline) {
        console.log('delete room due to inactivity:', room.id);
        this.deleteRoom(roomId);
      }
    }
    // list the result
    console.log('scan rooms result: ', this.listRooms().length);
  }
}
