import { Module } from "@nestjs/common";
import { RoomsController } from "./rooms.controller";
import { RoomsService } from "./rooms.service";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsWsEmitter } from "./rooms.ws-emitter";
import { RtcGateway } from "./rtc.gateway";

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomsGateway, RoomsWsEmitter, RtcGateway],
  exports: [RoomsService],
})
export class RoomsModule {}