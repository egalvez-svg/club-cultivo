import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { AppointmentReason } from '../common/enums/appointment.enum';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
    ) { }

    async create(organizationId: string, createDto: CreateAppointmentDto) {
        if (!createDto.patientId && !createDto.guestName) {
            throw new BadRequestException('Debe indicar un paciente o el nombre del visitante');
        }

        // Force UTC to ensure wall-time consistency (T10:00 stays 10:00 in DB)
        let dateStr = createDto.date;
        if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-')) {
            dateStr += 'Z';
        }
        const date = new Date(dateStr);

        // Validate availability slot
        await this.availabilityService.validateSlot(organizationId, date, createDto.reason);

        return this.prisma.appointment.create({
            data: {
                organization: { connect: { id: organizationId } },
                ...(createDto.patientId && { patient: { connect: { id: createDto.patientId } } }),
                guestName: createDto.guestName,
                guestPhone: createDto.guestPhone,
                date: date,
                reason: createDto.reason,
            },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.appointment.findMany({
            where: { organizationId },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
            orderBy: { date: 'desc' },
        });
    }

    async findByPatient(organizationId: string, patientId: string, search?: string) {
        return this.prisma.appointment.findMany({
            where: {
                organizationId,
                patientId,
                ...(search && {
                    reason: search as AppointmentReason,
                }),
            },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
            orderBy: { date: 'desc' },
        });
    }

    async findToday(organizationId: string, start: Date, end: Date) {
        return this.prisma.appointment.findMany({
            where: {
                organizationId,
                date: { gte: start, lte: end },
            },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
            orderBy: { date: 'asc' },
        });
    }

    async findOne(organizationId: string, id: string) {
        const appointment = await this.prisma.appointment.findFirst({
            where: { organizationId, id },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
        });
        if (!appointment) {
            throw new NotFoundException('Turno no encontrado');
        }
        return appointment;
    }

    async update(organizationId: string, id: string, updateDto: UpdateAppointmentDto) {
        await this.findOne(organizationId, id);
        return this.prisma.appointment.update({
            where: { id },
            data: {
                ...(updateDto.date && {
                    date: new Date(updateDto.date.includes('Z') || updateDto.date.includes('+') || updateDto.date.includes('-')
                        ? updateDto.date
                        : updateDto.date + 'Z')
                }),
                ...(updateDto.reason && { reason: updateDto.reason }),
                ...(updateDto.status && { status: updateDto.status }),
            },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
        });
    }

    async cancel(organizationId: string, id: string) {
        await this.findOne(organizationId, id);
        return this.prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                patient: { select: { fullName: true, documentNumber: true } },
            },
        });
    }
}
