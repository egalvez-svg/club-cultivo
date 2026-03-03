import { Module } from '@nestjs/common';
import { StrainsService } from './strains.service';
import { StrainsController } from './strains.controller';

@Module({
  providers: [StrainsService],
  controllers: [StrainsController]
})
export class StrainsModule {}
