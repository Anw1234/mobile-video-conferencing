import { IsString, IsUUID } from "class-validator";

export class LeaveRoomDto {
  @IsString()
  @IsUUID()
  participantId: string;
}