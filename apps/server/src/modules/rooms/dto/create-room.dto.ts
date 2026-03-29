import { IsOptional, IsString, MinLength, MaxLength } from "class-validator";

export class CreateRoomDto {
  @IsOptional() // create room with no title
  @IsString()
  @MinLength(2) 
  @MaxLength(60) 
  title?: string;
}