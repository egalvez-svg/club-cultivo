import { Module } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';

@Module({
  providers: [LotsService],
  controllers: [LotsController],
  exports: [LotsService]
})
export class LotsModule { }
