import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) { }

    async findToday(organizationId: string, start: Date, end: Date) {
        return this.prisma.appointment.findMany({
            where: {
                organizationId,
                date: { gte: start, lte: end },
            },
            include: {
                patient: { select: { fullName: true } },
            },
            orderBy: { date: 'asc' },
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.appointment.findMany({
            where: { organizationId },
            include: {
                patient: { select: { fullName: true } },
            },
            orderBy: { date: 'desc' },
        });
    }
}
