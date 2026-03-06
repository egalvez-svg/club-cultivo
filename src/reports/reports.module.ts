import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from '../pdf/pdf.service';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService, PdfService],
  controllers: [ReportsController],
  exports: [ReportsService]
})
export class ReportsModule { }
