import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get('check/:documentNumber')
    @ApiOperation({ summary: 'Verificar existencia por documento', description: 'Busca si ya existe un usuario con ese número de documento en la organización' })
    @ApiResponse({ status: 200, description: 'Resultado de la búsqueda' })
    checkByDocument(@Request() req, @Param('documentNumber') documentNumber: string) {
        return this.patientsService.checkByDocument(req.user.organizationId, documentNumber);
    }

    @Post()
    @ApiOperation({ summary: 'Registrar paciente', description: 'Crea un nuevo registro de paciente con auditoría' })
    @ApiResponse({ status: 201, description: 'Paciente creado exitosamente' })
    @ApiResponse({ status: 409, description: 'Número de documento duplicado' })
    create(@Request() req, @Body() createPatientDto: CreatePatientDto) {
        return this.patientsService.create(req.user.organizationId, createPatientDto, req.user.id);
    }

    @Get('me/dashboard')
    @ApiOperation({ summary: 'Mi panel de paciente', description: 'Retorna toda la informacion del dashboard del paciente autenticado: reprocan, consumo mensual, turnos pendientes' })
    @ApiResponse({ status: 200, description: 'Dashboard del paciente' })
    getMyDashboard(@Request() req) {
        return this.patientsService.getMyDashboard(req.user.organizationId, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Listar pacientes', description: 'Retorna todos los pacientes de la organización' })
    findAll(@Request() req) {
        return this.patientsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver paciente', description: 'Detalle de un paciente específico' })
    @ApiResponse({ status: 200, description: 'Paciente encontrado' })
    @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.patientsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar paciente', description: 'Modifica datos de un paciente existente' })
    update(@Request() req, @Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
        return this.patientsService.update(req.user.organizationId, id, updatePatientDto, req.user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar paciente', description: 'Desactiva/Elimina un paciente (soft-delete si aplica)' })
    remove(@Request() req, @Param('id') id: string) {
        return this.patientsService.remove(req.user.organizationId, id, req.user.id);
    }
}
