import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [],
  controllers: [AppController, HealthController, RoomsController],
  providers: [AppService, HealthService, RoomsService],
})
export class AppModule {}