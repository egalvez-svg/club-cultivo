import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RegisterPaymentDto } from './dto/payment.dto';

@ApiTags('Pagos y Recuperación de Costos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar pagos', description: 'Obtiene todos los registros de pago de la organización' })
    findAll(@Request() req) {
        return this.paymentsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver pago', description: 'Detalle de un pago y su dispensa asociada' })
    @ApiResponse({ status: 200, description: 'Pago encontrado' })
    @ApiResponse({ status: 404, description: 'Pago no encontrado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.paymentsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id/register')
    @ApiOperation({ summary: 'Registrar pago', description: 'Registra la percepción del pago y genera el movimiento de caja' })
    @ApiResponse({ status: 200, description: 'Pago registrado exitosamente' })
    @ApiResponse({ status: 400, description: 'Pago ya registrado o inválido' })
    register(@Request() req, @Param('id') id: string, @Body() registerPaymentDto: RegisterPaymentDto) {
        return this.paymentsService.registerPayment(req.user.organizationId, id, req.user.id, registerPaymentDto);
    }
}
