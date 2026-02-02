import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import { CreateRoomDto } from "./dto/create-room.dto";

@Controller("rooms")
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  createRoom(@Body() body: CreateRoomDto) {
    return this.roomsService.create(body.title);
  }

  @Get(":roomId")
  getRoom(@Param("roomId") roomId: string) {
    return this.roomsService.getById(roomId);
  }
}