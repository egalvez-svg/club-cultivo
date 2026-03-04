import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService
    ) { }

    async create(organizationId: string, createDto: CreateRoleDto, performedById: string): Promise<Role> {
        const name = createDto.name.toUpperCase();

        const existing = await this.prisma.role.findFirst({
            where: {
                name,
                OR: [
                    { organizationId },
                    { organizationId: null }
                ]
            }
        });

        if (existing) {
            throw new ConflictException('Ya existe un rol con ese nombre en esta organización o en el sistema.');
        }

        const role = await this.prisma.role.create({
            data: {
                name,
                organizationId
            }
        });

        await this.auditService.recordEvent({
            organizationId: organizationId || 'SYSTEM', // Fallback to SYSTEM if global
            entityType: 'ROLE',
            entityId: role.id,
            action: 'ROLE_CREATED',
            newData: role,
            performedById
        });

        return role;
    }

    async findAll(organizationId: string): Promise<Role[]> {
        return this.prisma.role.findMany({
            where: {
                name: { not: 'SUPER_ADMIN' },
                OR: [
                    { organizationId: organizationId },
                    { organizationId: null }
                ]
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(organizationId: string, id: string): Promise<Role> {
        const role = await this.prisma.role.findFirst({
            where: {
                id,
                OR: [
                    { organizationId },
                    { organizationId: null }
                ]
            },
            include: {
                _count: { select: { userRoles: true } }
            }
        });

        if (!role) {
            throw new NotFoundException('Rol no encontrado');
        }

        return role;
    }

    async findByName(name: string, organizationId?: string): Promise<Role | null> {
        return this.prisma.role.findFirst({
            where: {
                name,
                OR: [
                    { organizationId },
                    { organizationId: null }
                ]
            }
        });
    }

    async update(organizationId: string, id: string, updateDto: UpdateRoleDto, performedById: string): Promise<Role> {
        const previousData = await this.findOne(organizationId, id);

        if (previousData.organizationId === null) {
            throw new ConflictException('No se puede modificar un rol del sistema');
        }

        if (updateDto.name) {
            const newName = updateDto.name.toUpperCase();
            const existing = await this.prisma.role.findFirst({
                where: {
                    name: newName,
                    id: { not: id },
                    OR: [
                        { organizationId },
                        { organizationId: null }
                    ]
                }
            });

            if (existing) {
                throw new ConflictException('Ya existe un rol con ese nombre');
            }
            updateDto.name = newName;
        }

        const role = await this.prisma.role.update({
            where: { id },
            data: updateDto
        });

        await this.auditService.recordEvent({
            organizationId: organizationId || 'SYSTEM',
            entityType: 'ROLE',
            entityId: role.id,
            action: 'ROLE_UPDATED',
            previousData,
            newData: role,
            performedById
        });

        return role;
    }

    async remove(organizationId: string, id: string): Promise<{ message: string }> {
        const role = await this.findOne(organizationId, id);

        // if (role.organizationId === null) {
        //     throw new ConflictException('No se pueden eliminar roles del sistema');
        // }

        const count = await this.prisma.userRole.count({
            where: { roleId: id }
        });



        if (count > 0) {
            throw new ConflictException('No se puede eliminar el rol porque hay usuarios asignados a él');
        }

        await this.prisma.role.delete({
            where: { id }
        });

        return { message: 'Rol eliminado exitosamente' };
    }

    async assignRole(userId: string, roleId: string, isDefault: boolean = false, tx?: any) {
        const prisma = tx || this.prisma;
        return prisma.userRole.upsert({
            where: {
                userId_roleId: { userId, roleId }
            },
            create: { userId, roleId, isDefault },
            update: { isDefault }
        });
    }
}
