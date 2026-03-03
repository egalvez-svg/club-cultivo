import { Module } from '@nestjs/common';
import { ReprocanController } from './reprocan.controller';
import { ReprocanService } from './reprocan.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReprocanController],
  providers: [ReprocanService],
  exports: [ReprocanService],
})
export class ReprocanModule { }
