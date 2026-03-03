import { Controller, Get, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { OpenSessionDto, CloseSessionDto, CreateCashMovementDto } from './dto/cash-register.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Cash Register / Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-register')
export class CashRegisterController {
    constructor(private readonly cashRegisterService: CashRegisterService) { }

    @Get('active')
    @ApiOperation({ summary: 'Obtener la sesión de caja activa' })
    getActiveSession(@Request() req) {
        return this.cashRegisterService.getActiveSession(req.user.organizationId);
    }

    @Post('open')
    @ApiOperation({ summary: 'Abrir una nueva sesión de caja' })
    openSession(@Request() req, @Body() dto: OpenSessionDto) {
        return this.cashRegisterService.openSession(req.user.organizationId, req.user.id, dto);
    }

    @Post('close')
    @ApiOperation({ summary: 'Cerrar la sesión de caja actual' })
    closeSession(@Request() req, @Body() dto: CloseSessionDto) {
        return this.cashRegisterService.closeSession(req.user.organizationId, req.user.id, dto);
    }

    @Post('movements')
    @ApiOperation({ summary: 'Registrar un movimiento manual (Ingreso/Egreso)' })
    createMovement(@Request() req, @Body() dto: CreateCashMovementDto) {
        return this.cashRegisterService.createMovement(req.user.organizationId, req.user.id, dto);
    }

    @Get('history')
    @ApiOperation({ summary: 'Obtener historial reciente de sesiones' })
    getHistory(@Request() req) {
        return this.cashRegisterService.getRecentSessions(req.user.organizationId);
    }
}
