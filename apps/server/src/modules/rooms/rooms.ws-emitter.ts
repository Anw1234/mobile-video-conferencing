import { Injectable } from "@nestjs/common";
import { RoomsGateway } from "./rooms.gateway";
import type { Participant, Room } from "./types";

@Injectable()
export class RoomsWsEmitter {
  constructor(private readonly gw: RoomsGateway) {}

  roomCreated(room: Room) {
    // global broadcast (toți clienții conectați)
    this.gw.server.emit("rooms:created", room);
  }

  participantJoined(roomId: string, participant: Participant) {
    // doar cei "abonați" la camera respectivă
    this.gw.server.to(roomId).emit("rooms:participantJoined", {
      roomId,
      participant,
    });
  }

  participantLeft(roomId: string, participantId: string) {
    this.gw.server.to(roomId).emit("rooms:participantLeft", {
      roomId,
      participantId,
    });
  }

  participantsUpdated(roomId: string, participants: Participant[]) {
    this.gw.server.to(roomId).emit("rooms:participants", {
      roomId,
      participants,
    });
  }
}