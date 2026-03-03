import { Module } from '@nestjs/common';
import { DispensationsService } from './dispensations.service';
import { DispensationsController } from './dispensations.controller';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { LotsModule } from '../lots/lots.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    CashRegisterModule,
    UsersModule,
    ProductsModule,
    LotsModule,
    PaymentsModule
  ],
  providers: [DispensationsService],
  controllers: [DispensationsController]
})
export class DispensationsModule { }
