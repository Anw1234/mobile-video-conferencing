import { Module } from "@nestjs/common";
import { RoomsController } from "./rooms.controller";
import { RoomsService } from "./rooms.service";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsWsEmitter } from "./rooms.ws-emitter";

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway, RoomsWsEmitter],
  exports: [RoomsService],
})
export class RoomsModule {}