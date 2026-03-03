import { Module } from '@nestjs/common';
import { ReprocanController } from './reprocan.controller';
import { ReprocanService } from './reprocan.service';

@Module({
  controllers: [ReprocanController],
  providers: [ReprocanService]
})
export class ReprocanModule {}
