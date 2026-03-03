import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Auditoría Inmutable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get()
    @ApiOperation({ summary: 'Consultar bitácora de auditoría', description: 'Retorna eventos de auditoría filtrables por entidad' })
    @ApiQuery({ name: 'entityType', required: false, description: 'Tipo de entidad (Patient, Strain, etc.)' })
    @ApiQuery({ name: 'entityId', required: false, description: 'ID específico de la entidad' })
    findAll(@Request() req, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
        return this.auditService.findAll(req.user.organizationId, entityType, entityId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver evento de auditoría', description: 'Detalle técnico de un cambio específico (dif de datos)' })
    @ApiResponse({ status: 200, description: 'Evento encontrado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.auditService.findOne(req.user.organizationId, id);
    }
}
