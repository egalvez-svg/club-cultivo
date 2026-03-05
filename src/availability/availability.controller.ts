import { Controller, Get, Post, Delete, Query, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentReason } from '../common/enums/appointment.enum';
import { CreateAvailabilityConfigDto } from './dto/availability-config.dto';

@ApiTags('Disponibilidad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
    constructor(private availabilityService: AvailabilityService) { }

    @Get('slots')
    @ApiOperation({ summary: 'Obtener turnos disponibles', description: 'Retorna los horarios libres para una fecha y motivo específico' })
    getSlots(
        @Request() req,
        @Query('date') date: string,
        @Query('reason') reason: AppointmentReason,
    ) {
        return this.availabilityService.getAvailableSlots(req.user.organizationId, date, reason);
    }

    @Post('config')
    @ApiOperation({ summary: 'Configurar disponibilidad', description: 'Crea una nueva regla de disponibilidad para la organización' })
    setConfig(@Request() req, @Body() dto: CreateAvailabilityConfigDto) {
        return this.availabilityService.setConfig(req.user.organizationId, dto);
    }

    @Get('config')
    @ApiOperation({ summary: 'Listar configuraciones', description: 'Retorna todas las reglas de disponibilidad de la organización' })
    getConfigs(@Request() req) {
        return this.availabilityService.getConfigs(req.user.organizationId);
    }

    @Delete('config/:id')
    @ApiOperation({ summary: 'Eliminar configuración', description: 'Borra una regla de disponibilidad' })
    deleteConfig(@Request() req, @Param('id') id: string) {
        return this.availabilityService.deleteConfig(req.user.organizationId, id);
    }
}
