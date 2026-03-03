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
}
