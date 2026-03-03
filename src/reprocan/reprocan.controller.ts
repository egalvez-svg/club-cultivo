import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ReprocanService } from './reprocan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateReprocanDto } from './dto/create-reprocan.dto';
import { UpdateReprocanDto } from './dto/update-reprocan.dto';

@ApiTags('Reprocan History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients/:patientId/reprocan')
export class ReprocanController {
    constructor(private readonly reprocanService: ReprocanService) { }

    @Post()
    @ApiOperation({ summary: 'Agregar nuevo registro REPROCANN al paciente' })
    @ApiResponse({ status: 201, description: 'Registro creado' })
    create(
        @Request() req,
        @Param('patientId') patientId: string,
        @Body() createReprocanDto: CreateReprocanDto
    ) {
        return this.reprocanService.create(req.user.organizationId, patientId, createReprocanDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener historial REPROCANN del paciente' })
    @ApiResponse({ status: 200, description: 'Historial retornado' })
    findAll(@Request() req, @Param('patientId') patientId: string) {
        return this.reprocanService.findAllByPatient(req.user.organizationId, patientId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar registro REPROCANN' })
    @ApiResponse({ status: 200, description: 'Registro actualizado' })
    update(
        @Request() req,
        @Param('patientId') patientId: string,
        @Param('id') id: string,
        @Body() updateReprocanDto: UpdateReprocanDto
    ) {
        return this.reprocanService.update(req.user.organizationId, patientId, id, updateReprocanDto);
    }
}
