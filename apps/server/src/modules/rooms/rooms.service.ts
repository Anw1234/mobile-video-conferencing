import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Room, Participant } from './types';

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();
  private readonly participantsByRoom = new Map<string, Participant[]>();

  create(title?: string): Room {
    const room: Room = {
      id: randomUUID(),
      createdAt: Date.now(),
      title: title?.trim() ? title.trim() : undefined,
    };

    this.rooms.set(room.id, room);
    return room;
  }

  getById(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  join(roomId: string, displayName: string) {
    this.getById(roomId);

    const participant: Participant = {
      id: randomUUID(),
      roomId,
      displayName: displayName.trim(),
      joinedAt: Date.now(),
    };

    const list = this.participantsByRoom.get(roomId) ?? [];
    list.push(participant);
    this.participantsByRoom.set(roomId, list);

    const token = randomUUID();

    return {
      roomId,
      participantId: participant.id,
      token,
      participant, // important pt WS
    };
  }

  getParticipants(roomId: string) {
    this.getById(roomId);
    return this.participantsByRoom.get(roomId) ?? [];
  }

  leave(roomId: string, participantId: string) {
    this.getById(roomId);

    const list = this.participantsByRoom.get(roomId) ?? [];
    const idx = list.findIndex((p) => p.id === participantId);

    if (idx === -1) {
      throw new NotFoundException('Participant not found');
    }

    list.splice(idx, 1);

    if (list.length === 0) this.participantsByRoom.delete(roomId);
    else this.participantsByRoom.set(roomId, list);

    return { roomId, participantId, left: true };
  }
}
