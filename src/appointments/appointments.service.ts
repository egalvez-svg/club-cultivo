import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, createDto: CreateAppointmentDto) {
        if (!createDto.patientId && !createDto.guestName) {
            throw new BadRequestException('Debe indicar un paciente o el nombre del visitante');
        }

        return this.prisma.appointment.create({
            data: {
                organization: { connect: { id: organizationId } },
                ...(createDto.patientId && { patient: { connect: { id: createDto.patientId } } }),
                guestName: createDto.guestName,
                guestPhone: createDto.guestPhone,
                date: new Date(createDto.date),
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
                ...(updateDto.date && { date: new Date(updateDto.date) }),
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
