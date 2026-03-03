import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesModule } from '../roles/roles.module';
import { ReprocanModule } from '../reprocan/reprocan.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, RolesModule, ReprocanModule, AuditModule],
  providers: [PatientsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule { }
