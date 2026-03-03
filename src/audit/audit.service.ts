import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async recordEvent(data: {
        organizationId: string;
        entityType: string;
        entityId: string;
        action: string;
        previousData?: any;
        newData?: any;
        performedById: string;
        notes?: string;
    }, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        return client.auditEvent.create({
            data: {
                ...data,
                previousData: data.previousData ? JSON.parse(JSON.stringify(data.previousData)) : undefined,
                newData: data.newData ? JSON.parse(JSON.stringify(data.newData)) : undefined,
            },
        });
    }

    async findAll(organizationId: string, entityType?: string, entityId?: string) {
        return this.prisma.auditEvent.findMany({
            where: {
                organizationId,
                ...(entityType && { entityType }),
                ...(entityId && { entityId }),
            },
            include: { performedBy: { select: { fullName: true } } },
            orderBy: { performedAt: 'desc' },
        });
    }

    async findOne(organizationId: string, id: string) {
        return this.prisma.auditEvent.findFirst({
            where: { id, organizationId },
            include: { performedBy: { select: { fullName: true } } },
        });
    }
}
