import { Controller, Get, Post, Patch, Body, Param, UseGuards, Delete, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Organizaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar organizaciones', description: 'Retorna todas las organizaciones activas' })
    @ApiResponse({ status: 200, description: 'Lista de organizaciones' })
    findAll() {
        return this.organizationsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Ver organización', description: 'Detalle de una organización específica' })
    @ApiResponse({ status: 200, description: 'Organización encontrada' })
    @ApiParam({ name: 'id', description: 'ID de la organización' })
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear organización', description: 'Registra una nueva organización en el sistema' })
    @ApiResponse({ status: 201, description: 'Organización creada' })
    create(@Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create(createOrganizationDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar organización', description: 'Modifica datos de una organización existente' })
    @ApiResponse({ status: 200, description: 'Organización actualizada' })
    @ApiParam({ name: 'id', description: 'ID de la organización' })
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationsService.update(id, updateOrganizationDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar organización', description: 'Elimina una organización si no tiene usuarios asociados' })
    @ApiResponse({ status: 204, description: 'Organización eliminada' })
    @ApiResponse({ status: 409, description: 'No se puede eliminar: existen usuarios asociados' })
    @ApiParam({ name: 'id', description: 'ID de la organización' })
    async remove(@Param('id') id: string) {
        try {
            await this.organizationsService.remove(id);
        } catch (error) {
            throw new ConflictException(error.message);
        }
    }
}
