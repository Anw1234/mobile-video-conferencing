import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { RoomsModule } from "./modules/rooms/rooms.module";

@Module({
  imports: [HealthModule, RoomsModule],
})
export class AppModule {}