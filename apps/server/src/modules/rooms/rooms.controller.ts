import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { RoomsWsEmitter } from './rooms.ws-emitter';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly ws: RoomsWsEmitter,
  ) {}

  @Post()
  createRoom(@Body() body: CreateRoomDto) {
    const room = this.roomsService.create(body.title);
    this.ws.roomCreated(room);
    return room;
  }

  @Post(':roomId/join')
  joinRoom(@Param('roomId') roomId: string, @Body() body: JoinRoomDto) {
    const result = this.roomsService.join(roomId, body.displayName);

    this.ws.participantJoined(roomId, result.participant);

    const participants = this.roomsService.getParticipants(roomId);
    this.ws.participantsUpdated(roomId, participants);

    return result;
  }

  @Post(':roomId/leave')
  leaveRoom(@Param('roomId') roomId: string, @Body() body: LeaveRoomDto) {
    const result = this.roomsService.leave(roomId, body.participantId);

    this.ws.participantLeft(roomId, body.participantId);

    const participants = this.roomsService.getParticipants(roomId);
    this.ws.participantsUpdated(roomId, participants);

    return result;
  }

  @Get(':roomId/participants')
  getParticipants(@Param('roomId') roomId: string) {
    return this.roomsService.getParticipants(roomId);
  }
}
