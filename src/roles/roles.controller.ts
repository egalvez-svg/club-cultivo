import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleName } from '../common/enums';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @Roles(RoleName.SUPER_ADMIN)
    @ApiOperation({ summary: 'Crear un nuevo rol', description: 'Crea un nuevo rol asociado a la organización proporcionada o a la del usuario' })
    @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 409, description: 'El nombre del rol ya existe' })
    create(@Request() req, @Body() createRoleDto: CreateRoleDto) {
        const targetOrgId = createRoleDto.organizationId || req.user.organizationId;
        return this.rolesService.create(targetOrgId, createRoleDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Listar roles', description: 'Retorna todos los roles disponibles para la organización (incluye los del sistema)' })
    @ApiResponse({ status: 200, description: 'Lista de roles' })
    findAll(@Request() req, @Query('organizationId') orgId?: string) {
        const targetOrgId = orgId || req.user.organizationId;
        return this.rolesService.findAll(targetOrgId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un rol por ID', description: 'Obtiene los detalles de un rol específico' })
    @ApiResponse({ status: 200, description: 'Detalles del rol' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    findOne(@Request() req, @Param('id') id: string, @Query('organizationId') orgId?: string) {
        const targetOrgId = orgId || req.user.organizationId;
        return this.rolesService.findOne(targetOrgId, id);
    }

    @Patch(':id')
    @Roles(RoleName.SUPER_ADMIN)
    @ApiOperation({ summary: 'Actualizar un rol', description: 'Actualiza el nombre de un rol existente' })
    @ApiResponse({ status: 200, description: 'Rol actualizado' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    @ApiResponse({ status: 409, description: 'Conflicto (ej. rol del sistema, nombre duplicado)' })
    update(@Request() req, @Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        const targetOrgId = updateRoleDto.organizationId || req.user.organizationId;
        return this.rolesService.update(targetOrgId, id, updateRoleDto, req.user.id);
    }

    @Delete(':id')
    @Roles(RoleName.SUPER_ADMIN)
    @ApiOperation({ summary: 'Eliminar un rol', description: 'Elimina un rol si no tiene usuarios asignados' })
    @ApiResponse({ status: 200, description: 'Rol eliminado' })
    @ApiResponse({ status: 404, description: 'Rol no encontrado' })
    @ApiResponse({ status: 409, description: 'Conflicto (ej. rol en uso, rol del sistema)' })
    remove(@Request() req, @Param('id') id: string, @Body('organizationId') bodyOrgId?: string) {
        const targetOrgId = bodyOrgId || req.user.organizationId;
        return this.rolesService.remove(targetOrgId, id);
    }
}
