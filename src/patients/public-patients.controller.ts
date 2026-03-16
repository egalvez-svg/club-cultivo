import { Controller, Post, Body } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePatientDto } from './dto/patient.dto';

@ApiTags('Pacientes (Público)')
@Controller('public/patients')
export class PublicPatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Post('apply')
    @ApiOperation({ summary: 'Registrar postulante', description: 'Crea un nuevo registro de paciente externo y envía la solicitud a PENDING' })
    @ApiResponse({ status: 201, description: 'Postulación creada exitosamente' })
    @ApiResponse({ status: 409, description: 'Número de documento o email duplicado' })
    apply(@Body() createPatientDto: CreatePatientDto & { organizationId: string }) {
        // En el DTO recibimos el organizationId además de los datos del paciente
        return this.patientsService.createPublicApplication(createPatientDto.organizationId, createPatientDto);
    }
}
