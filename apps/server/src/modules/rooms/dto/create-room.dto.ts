import { IsOptional, IsString, MinLength, MaxLength } from "class-validator";

export class CreateRoomDto {
  @IsOptional() // create room with no title
  @IsString()
  @MinLength(2) // title must be at least 2 characters long
  @MaxLength(60) //prevent spam and extra large payloads
  title?: string;
}