import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { AuditModule } from '../audit/audit.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
    imports: [AuditModule, ReportsModule],
    providers: [MembershipService],
    controllers: [MembershipController],
    exports: [MembershipService],
})
export class MembershipModule { }
