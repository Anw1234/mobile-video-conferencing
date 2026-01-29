import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type Room = {
  id: string;
  createdAt: number;
  title?: string;
};

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();

  create(title?: string): Room {
    const room: Room = {
      id: randomUUID(),
      createdAt: Date.now(),
      title: title?.trim() || undefined,
    };

    this.rooms.set(room.id, room);
    return room;
  }

  getById(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }
}