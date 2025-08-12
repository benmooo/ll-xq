import type { Room } from './types';
import { v4 as uuidv4 } from 'uuid';
import { createXiangqi } from '@ll-xq/game-core';

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(creatorName: string) {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      players: [],
      state: createXiangqi(),
      createdAt: Date.now(),
      createdBy: creatorName,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, playerName: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    if (room.players.length >= 2) throw new Error(`Room ${roomId} is full`);
    room.players.push({ id: uuidv4(), name: playerName, side: 'b' });
    return room;
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
}
