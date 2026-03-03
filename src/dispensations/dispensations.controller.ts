import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DispensationsService } from './dispensations.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Dispensations / Dispensaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dispensations')
export class DispensationsController {
    constructor(private readonly dispensationsService: DispensationsService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar nueva dispensación con pago' })
    @ApiResponse({ status: 201, description: 'Dispensación y pago registrados' })
    create(@Request() req, @Body() createDispensationDto: CreateDispensationDto) {
        return this.dispensationsService.create(req.user.organizationId, req.user.id, createDispensationDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar historial de dispensaciones' })
    @ApiResponse({ status: 200, description: 'Historial de dispensaciones' })
    findAll(@Request() req) {
        return this.dispensationsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver detalles de una dispensación' })
    @ApiResponse({ status: 200, description: 'Detalle resuelto' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.dispensationsService.findOne(req.user.organizationId, id);
    }
}
