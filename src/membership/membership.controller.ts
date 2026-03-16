import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, Res, NotFoundException } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';
import { ReportsService } from '../reports/reports.service';
import { Response } from 'express';
import { SignatureType } from '../common/enums';

import { ApproveMembershipDto, SignMembershipDto } from './dto/membership.dto';

@ApiTags('Membresías (ONG)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membership')
export class MembershipController {
    constructor(
        private membershipService: MembershipService,
        private reportsService: ReportsService
    ) { }

    @Get()
    @ApiOperation({ summary: 'Listar todas las membresías', description: 'Retorna socios y aspirantes' })
    findAll(@Request() req, @Query('status') status?: MembershipStatus) {
        return this.membershipService.findAll(req.user.organizationId, status);
    }

    @Get('pending')
    @ApiOperation({ summary: 'Listar aspirantes pendientes', description: 'Retorna solicitudes que esperan aprobación de Comisión' })
    findPending(@Request() req) {
        return this.membershipService.findPending(req.user.organizationId);
    }

    @Get('pending-count')
    @ApiOperation({ summary: 'Contar aspirantes pendientes', description: 'Retorna la cantidad de solicitudes en estado PENDING para notificaciones visuales' })
    async countPending(@Request() req) {
        const count = await this.membershipService.countPending(req.user.organizationId);
        return { count };
    }

    @Get('register-book')
    @ApiOperation({ summary: 'Libro de Registro de Asociados', description: 'Exporta el listado oficial de socios en PDF' })
    async getRegisterBook(@Request() req, @Res() res: Response) {
        const buffer = await this.reportsService.generateMemberRegister(req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=libro_asociados.pdf',
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('application-form/:id')
    @ApiOperation({ summary: 'Descargar Solicitud (por ID)', description: 'Genera el PDF de solicitud para un socio específico' })
    async getApplicationForm(@Request() req, @Param('id') id: string, @Res() res: Response) {
        const buffer = await this.reportsService.generateMembershipApplicationForm(id, req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=solicitud_ingreso_${id}.pdf`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('consent-form/:id')
    @ApiOperation({ summary: 'Descargar Consentimiento (por ID)', description: 'Genera el anexo de Ley 25.326 en PDF para un socio específico' })
    async getConsentForm(@Request() req, @Param('id') id: string, @Res() res: Response) {
        const buffer = await this.reportsService.generateDataProtectionConsent(id, req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=consentimiento_datos_${id}.pdf`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('my-application')
    @ApiOperation({ summary: 'Descargar mi Solicitud', description: 'El paciente descarga su propio formulario firmado' })
    async getMyApplication(@Request() req, @Res() res: Response) {
        const membership = await this.membershipService.findByUser(req.user.id, req.user.organizationId);
        if (!membership) throw new NotFoundException('Membresía no encontrada');

        const buffer = await this.reportsService.generateMembershipApplicationForm(membership.id, req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=mi_solicitud_ingreso.pdf',
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('my-consent')
    @ApiOperation({ summary: 'Descargar mi Consentimiento', description: 'El paciente descarga su propio consentimiento firmado' })
    async getMyConsent(@Request() req, @Res() res: Response) {
        const membership = await this.membershipService.findByUser(req.user.id, req.user.organizationId);
        if (!membership) throw new NotFoundException('Membresía no encontrada');

        const buffer = await this.reportsService.generateDataProtectionConsent(membership.id, req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=mi_consentimiento_datos.pdf',
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get('legal-texts')
    @ApiOperation({ summary: 'Obtener textos legales', description: 'Retorna los documentos para mostrar en el modal de firma front' })
    getLegalTexts(@Request() req) {
        return this.membershipService.getLegalTexts(req.user.id);
    }

    @Post('sign')
    @ApiOperation({ summary: 'Firmar digitalmente', description: 'Registra la aceptación del usuario' })
    sign(@Request() req, @Body() data: SignMembershipDto) {
        const ip = req.ip || req.connection.remoteAddress;
        return this.membershipService.signDocument(req.user.id, req.user.organizationId, data.type, ip);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Aprobar socio', description: 'Formaliza el ingreso del socio a la ONG' })
    approve(
        @Request() req,
        @Param('id') id: string,
        @Body() data: ApproveMembershipDto
    ) {
        return this.membershipService.approve(req.user.organizationId, id, req.user.id, data);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Rechazar socio', description: 'Deniega el ingreso a la ONG' })
    reject(@Request() req, @Param('id') id: string) {
        return this.membershipService.reject(req.user.organizationId, id, req.user.id);
    }
}
