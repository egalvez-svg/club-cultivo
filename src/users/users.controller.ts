import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'Listar usuarios', description: 'Retorna los usuarios activos de la organización' })
    @ApiResponse({ status: 200, description: 'Lista de usuarios' })
    findAll(@Request() req) {
        return this.usersService.findAll(req.user.organizationId);
    }

    @Post()
    @ApiOperation({ summary: 'Crear usuario', description: 'Registra un nuevo usuario. Admin puede especificar la organización.' })
    @ApiResponse({ status: 201, description: 'Usuario creado' })
    @ApiResponse({ status: 409, description: 'El email ya está registrado' })
    create(@Request() req, @Body() createUserDto: CreateUserDto) {
        return this.usersService.create(req.user.organizationId, createUserDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar usuario', description: 'Modifica los datos de un usuario existente. Si se incluye organizationId en el body, se actualizará.' })
    @ApiParam({ name: 'id', description: 'ID del usuario' })
    @ApiResponse({ status: 200, description: 'Usuario actualizado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    update(@Param('id') id: string, @Request() req, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, req.user.organizationId, updateUserDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar usuario', description: 'Realiza un borrado lógico del usuario' })
    @ApiParam({ name: 'id', description: 'ID del usuario' })
    @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    remove(@Param('id') id: string, @Request() req) {
        return this.usersService.delete(id, req.user.organizationId);
    }
}
