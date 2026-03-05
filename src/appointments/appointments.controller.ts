import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@ApiTags('Turnos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Agendar turno', description: 'Crea un nuevo turno para un paciente' })
    @ApiResponse({ status: 201, description: 'Turno creado exitosamente' })
    create(@Request() req, @Body() createDto: CreateAppointmentDto) {
        return this.appointmentsService.create(req.user.organizationId, createDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar turnos', description: 'Retorna todos los turnos de la organizacion' })
    findAll(@Request() req) {
        return this.appointmentsService.findAll(req.user.organizationId);
    }

    @Get('today')
    @ApiOperation({ summary: 'Turnos de hoy', description: 'Retorna los turnos del dia actual' })
    findToday(@Request() req) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return this.appointmentsService.findToday(req.user.organizationId, start, end);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver turno', description: 'Detalle de un turno especifico' })
    @ApiResponse({ status: 200, description: 'Turno encontrado' })
    @ApiResponse({ status: 404, description: 'Turno no encontrado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.appointmentsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar turno', description: 'Modifica datos de un turno existente' })
    update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateAppointmentDto) {
        return this.appointmentsService.update(req.user.organizationId, id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Cancelar turno', description: 'Cancela un turno existente' })
    cancel(@Request() req, @Param('id') id: string) {
        return this.appointmentsService.cancel(req.user.organizationId, id);
    }
}
