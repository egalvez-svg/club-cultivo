import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo rol', description: 'Crea un nuevo rol asociado a la organización del usuario' })
    @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'El nombre del rol ya existe' })
    create(@Request() req, @Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(req.user.organizationId, createRoleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar roles', description: 'Retorna todos los roles disponibles para la organización (incluye los del sistema)' })
    @ApiResponse({ status: 200, description: 'Lista de roles' })
    findAll(@Request() req) {
        return this.rolesService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un rol por ID', description: 'Obtiene los detalles de un rol específico' })
    @ApiResponse({ status: 200, description: 'Detalles del rol' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    findOne(@Request() req, @Param('id') id: string) {
        return this.rolesService.findOne(req.user.organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un rol', description: 'Actualiza el nombre de un rol existente de la organización' })
    @ApiResponse({ status: 200, description: 'Rol actualizado' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    @ApiResponse({ status: 409, description: 'Conflicto (ej. rol del sistema, nombre duplicado)' })
    update(@Request() req, @Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.update(req.user.organizationId, id, updateRoleDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un rol', description: 'Elimina un rol si no tiene usuarios asignados' })
    @ApiResponse({ status: 200, description: 'Rol eliminado' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    @ApiResponse({ status: 409, description: 'Conflicto (ej. rol en uso, rol del sistema)' })
    remove(@Request() req, @Param('id') id: string) {
        return this.rolesService.remove(req.user.organizationId, id);
    }
}
