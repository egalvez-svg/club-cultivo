import { Controller, Get } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Organizaciones (Público)')
@Controller('public/organizations')
export class PublicOrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar organizaciones para postulantes', description: 'Retorna todas las organizaciones activas (id y nombre)' })
    @ApiResponse({ status: 200, description: 'Lista de organizaciones públicas' })
    async findAllPublic() {
        const orgs = await this.organizationsService.findAll();
        return orgs.map(o => ({
            id: o.id,
            name: o.name
        }));
    }
}
