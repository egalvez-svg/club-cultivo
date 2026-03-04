import { Controller, Get, Query, UseGuards, Request, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Reportes y Estadísticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('recent')
    @ApiOperation({ summary: 'Últimos Reportes Generados', description: 'Lista del historial de reportes generados en PDF' })
    async getRecentGeneratedReports(@Request() req) {
        return this.reportsService.getRecentGeneratedReports(req.user.organizationId);
    }

    @Get('patient-consumptions')
    @ApiOperation({ summary: 'Consumo por pacientes', description: 'Retorna el total de gramos dispensados por paciente en un período' })
    @ApiQuery({ name: 'month', example: '2', description: 'Mes numérico' })
    @ApiQuery({ name: 'year', example: '2026', description: 'Año' })
    getPatientConsumptions(
        @Request() req,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        return this.reportsService.getPatientConsumptions(
            req.user.organizationId,
            parseInt(month),
            parseInt(year),
        );
    }

    @Get('traceability/patients')
    @ApiOperation({ summary: 'Trazabilidad de Pacientes', description: 'Relación entre dispensaciones y permisos REPROCANN' })
    @ApiQuery({ name: 'month', example: '2', required: true })
    @ApiQuery({ name: 'year', example: '2026', required: true })
    @ApiQuery({ name: 'format', enum: ['json', 'pdf'], required: false })
    async getPatientTraceability(
        @Request() req,
        @Res() res: Response,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('format') format: 'json' | 'pdf' = 'json',
    ) {
        const result = await this.reportsService.getPatientTraceability(
            req.user.organizationId,
            parseInt(month),
            parseInt(year),
            format,
            req.user.id
        );

        if (format === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="REPROCANN_${month}_${year}.pdf"`,
                'Content-Length': (result as Buffer).length,
            });
            res.end(result);
        } else {
            res.json(result);
        }
    }

    @Get('traceability/production')
    @ApiOperation({ summary: 'Reporte de Evolución de Lotes', description: 'Historial de producción, costos y salidas' })
    @ApiQuery({ name: 'month', example: '2', required: true })
    @ApiQuery({ name: 'year', example: '2026', required: true })
    @ApiQuery({ name: 'format', enum: ['json', 'pdf'], required: false })
    async getProductionTraceability(
        @Request() req,
        @Res() res: Response,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('format') format: 'json' | 'pdf' = 'json',
    ) {
        const result = await this.reportsService.getCultivationReport(
            req.user.organizationId,
            parseInt(month),
            parseInt(year),
            format,
            req.user.id
        );

        if (format === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Cultivo_${month}_${year}.pdf"`,
                'Content-Length': (result as Buffer).length,
            });
            res.end(result);
        } else {
            res.json(result);
        }
    }

    @Get('finance/audit')
    @ApiOperation({ summary: 'Auditoría Financiera', description: 'Consolidado de ingresos, egresos y sesiones de caja' })
    @ApiQuery({ name: 'month', example: '2', required: true })
    @ApiQuery({ name: 'year', example: '2026', required: true })
    @ApiQuery({ name: 'format', enum: ['json', 'pdf'], required: false })
    async getFinancialAudit(
        @Request() req,
        @Res() res: Response,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('format') format: 'json' | 'pdf' = 'json',
    ) {
        const result = await this.reportsService.getFinancialAuditReport(
            req.user.organizationId,
            parseInt(month),
            parseInt(year),
            format,
            req.user.id
        );

        if (format === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Finanzas_${month}_${year}.pdf"`,
                'Content-Length': (result as Buffer).length,
            });
            res.end(result);
        } else {
            res.json(result);
        }
    }

    @Get('stock-projection')
    @ApiOperation({ summary: 'Proyección de Stock', description: 'Estado actual y disponibilidad de producto terminado' })
    getStockProjection(@Request() req) {
        return this.reportsService.getStockProjection(req.user.organizationId);
    }

    @Get('download/:id')
    @ApiOperation({ summary: 'Descargar Reporte Histórico', description: 'Permite descargar un PDF generado previamente' })
    async downloadReport(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        const result = await this.reportsService.getGeneratedReportContent(id);

        if (!result) {
            return res.status(404).json({ message: 'Reporte no encontrado' });
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${result.name}"`,
            'Content-Length': result.content.length,
        });

        res.end(result.content);
    }
}
