import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { StrainsService } from './strains.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateStrainDto } from './dto/create-strain.dto';
import { UpdateStrainDto } from './dto/update-strain.dto';

@ApiTags('Strains / Cepas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('strains')
export class StrainsController {
    constructor(private readonly strainsService: StrainsService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar nueva cepa (Genética)' })
    @ApiResponse({ status: 201, description: 'Cepa creada' })
    create(@Request() req, @Body() createStrainDto: CreateStrainDto) {
        return this.strainsService.create(req.user.organizationId, createStrainDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener catálogo de cepas activas con cantidad de lotes' })
    @ApiResponse({ status: 200, description: 'Catálogo retornado' })
    findAll(@Request() req) {
        return this.strainsService.findAll(req.user.organizationId);
    }

    @Get('released')
    @ApiOperation({ summary: 'Obtener catálogo de cepas activas con lotes liberados' })
    @ApiResponse({ status: 200, description: 'Catálogo de cepas liberadas retornado' })
    findAllReleased(@Request() req) {
        return this.strainsService.findAllReleased(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de una cepa específica' })
    @ApiResponse({ status: 200, description: 'Detalle retornado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.strainsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar propiedades de una cepa' })
    @ApiResponse({ status: 200, description: 'Cepa actualizada' })
    update(@Request() req, @Param('id') id: string, @Body() updateStrainDto: UpdateStrainDto) {
        return this.strainsService.update(req.user.organizationId, id, updateStrainDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Desactivar una cepa (Soft delete)' })
    @ApiResponse({ status: 200, description: 'Cepa desactivada' })
    remove(@Request() req, @Param('id') id: string) {
        return this.strainsService.remove(req.user.organizationId, id);
    }
}
