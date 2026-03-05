import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [AvailabilityService],
    controllers: [AvailabilityController],
    exports: [AvailabilityService],
})
export class AvailabilityModule { }
