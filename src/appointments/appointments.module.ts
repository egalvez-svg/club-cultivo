import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule, AvailabilityModule],
    providers: [AppointmentsService],
    controllers: [AppointmentsController],
    exports: [AppointmentsService],
})
export class AppointmentsModule { }
