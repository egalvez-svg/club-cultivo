import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { StrainsModule } from './strains/strains.module';
import { ProductsModule } from './products/products.module';
import { LotsModule } from './lots/lots.module';
import { StockModule } from './stock/stock.module';
import { DispensationsModule } from './dispensations/dispensations.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ReprocanModule } from './reprocan/reprocan.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PdfService } from './pdf/pdf.service';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [PrismaModule, AuthModule, PatientsModule, StrainsModule, ProductsModule, LotsModule, StockModule, DispensationsModule, PaymentsModule, ReportsModule, AuditModule, RolesModule, UsersModule, OrganizationsModule, ReprocanModule, CashRegisterModule, DashboardModule, AppointmentsModule],
  controllers: [AppController],
  providers: [AppService, PdfService],
  exports: [PdfService]
})
export class AppModule { }
