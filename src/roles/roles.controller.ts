import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @ApiOperation({ summary: 'Listar roles', description: 'Retorna todos los roles disponibles para la organización' })
    @ApiResponse({ status: 200, description: 'Lista de roles' })
    findAll(@Request() req) {
        return this.rolesService.findAll(req.user.organizationId);
    }
}
