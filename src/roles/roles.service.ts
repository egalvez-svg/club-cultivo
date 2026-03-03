import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string): Promise<Role[]> {
        return this.prisma.role.findMany({
            where: {
                OR: [
                    { organizationId: organizationId },
                    { organizationId: null }
                ]
            }
        });
    }

    async findByName(name: string, organizationId?: string) {
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
