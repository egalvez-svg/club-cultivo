import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { Organization } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction, SYSTEM_ORGANIZATION } from '../common/enums';

@Injectable()
export class OrganizationsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService
    ) { }

    async findAll(): Promise<Organization[]> {
        return this.prisma.organization.findMany({
            where: {
                active: true,
                name: { not: SYSTEM_ORGANIZATION }
            }
        });
    }

    async findOne(id: string): Promise<Organization | null> {
        return this.prisma.organization.findUnique({
            where: { id },
        });
    }

    async create(createOrganizationDto: CreateOrganizationDto, performedById: string): Promise<Organization> {
        const org = await this.prisma.organization.create({
            data: {
                name: createOrganizationDto.name,
                cuit: createOrganizationDto.cuit,
                address: createOrganizationDto.address,
                active: createOrganizationDto.active ?? true,
            },
        });

        await this.auditService.recordEvent({
            organizationId: org.id,
            entityType: 'ORGANIZATION',
            entityId: org.id,
            action: AuditAction.ORGANIZATION_CREATED,
            newData: org,
            performedById
        });

        return org;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto, performedById: string): Promise<Organization> {
        const previousData = await this.findOne(id);
        const org = await this.prisma.organization.update({
            where: { id },
            data: updateOrganizationDto,
        });

        await this.auditService.recordEvent({
            organizationId: org.id,
            entityType: 'ORGANIZATION',
            entityId: org.id,
            action: AuditAction.ORGANIZATION_UPDATED,
            previousData,
            newData: org,
            performedById
        });

        return org;
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
