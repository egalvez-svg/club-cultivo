import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { UsersModule } from '../users/users.module';
import { DispensationsModule } from '../dispensations/dispensations.module';
import { LotsModule } from '../lots/lots.module';
import { PaymentsModule } from '../payments/payments.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    UsersModule,
    DispensationsModule,
    LotsModule,
    PaymentsModule,
    AppointmentsModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController]
})
export class DashboardModule { }
