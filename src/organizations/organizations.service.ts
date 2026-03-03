import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { Organization } from '@prisma/client';

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<Organization[]> {
        return this.prisma.organization.findMany({
            where: { active: true }
        });
    }

    async findOne(id: string): Promise<Organization | null> {
        return this.prisma.organization.findUnique({
            where: { id },
        });
    }

    async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
        return this.prisma.organization.create({
            data: {
                name: createOrganizationDto.name,
                active: createOrganizationDto.active ?? true,
            },
        });
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
        return this.prisma.organization.update({
            where: { id },
            data: updateOrganizationDto,
        });
    }

    async remove(id: string): Promise<void> {
        const userCount = await this.prisma.user.count({
            where: { organizationId: id }
        });

        if (userCount > 0) {
            throw new Error(`No se puede eliminar la organización: existen ${userCount} usuarios asociados.`);
        }

        await this.prisma.organization.delete({
            where: { id }
        });
    }
}
