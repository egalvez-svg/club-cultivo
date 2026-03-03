import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LotsService } from './lots.service';
import { CreateLotDto, UpdateLotDto } from './dto/lots.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Production Lots / Lotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lots')
export class LotsController {
    constructor(private readonly lotsService: LotsService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo lote de producción' })
    @ApiResponse({ status: 201, description: 'Lote creado' })
    create(@Request() req, @Body() createLotDto: CreateLotDto) {
        return this.lotsService.create(req.user.organizationId, createLotDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los lotes de la organización' })
    @ApiResponse({ status: 200, description: 'Lista de lotes con su cepa' })
    findAll(@Request() req) {
        return this.lotsService.findAll(req.user.organizationId);
    }

    @Get('by-strain/:strainId')
    @ApiOperation({ summary: 'Obtener lotes disponibles (RELEASED) para una cepa específica' })
    @ApiResponse({ status: 200, description: 'Lista de lotes disponibles' })
    findByStrain(@Request() req, @Param('strainId') strainId: string) {
        return this.lotsService.findByStrain(req.user.organizationId, strainId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de un lote específico' })
    @ApiResponse({ status: 200, description: 'Detalles del lote' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.lotsService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un lote (estado, cantidades, etc)' })
    @ApiResponse({ status: 200, description: 'Lote actualizado' })
    update(@Request() req, @Param('id') id: string, @Body() updateLotDto: UpdateLotDto) {
        return this.lotsService.update(req.user.organizationId, id, updateLotDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un lote (solo si está en estado CREATED)' })
    @ApiResponse({ status: 200, description: 'Lote eliminado' })
    remove(@Request() req, @Param('id') id: string) {
        return this.lotsService.remove(req.user.organizationId, id);
    }
}
