import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/decorators/roles.decorator';
import { RolesGuard } from '../roles/guards/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener resumen del dashboard', description: 'Devuelve KPIs, últimas dispensaciones y turnos de hoy' })
    @ApiResponse({ status: 200, description: 'Resumen del dashboard' })
    async getSummary(@Request() req, @Query('organizationId') orgId?: string) {
        const targetOrgId = (req.user.role === 'SUPER_ADMIN' && orgId) ? orgId : req.user.organizationId;
        return this.dashboardService.getSummary(targetOrgId);
    }

    @Get('superadmin')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Obtener KPIs globales (SuperAdmin)', description: 'Retorna conteos globales de organizaciones, usuarios y salud del sistema' })
    @ApiResponse({ status: 200, description: 'KPIs globales del sistema' })
    async getSuperAdminSummary() {
        return this.dashboardService.getSuperAdminSummary();
    }

    @Get('organizations')
    @Roles('SUPER_ADMIN')
    @ApiOperation({ summary: 'Listado detallado de organizaciones', description: 'Retorna lista de clubes con conteos de staff, pacientes y lotes' })
    @ApiResponse({ status: 200, description: 'Listado de organizaciones con métricas' })
    async getOrganizationsDetailList() {
        return this.dashboardService.getOrganizationsDetailList();
    }
}
