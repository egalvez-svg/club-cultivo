import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentReason } from '../common/enums';
import { CreateAvailabilityConfigDto } from './dto/availability-config.dto';

@Injectable()
export class AvailabilityService {
    constructor(private prisma: PrismaService) { }

    async setConfig(organizationId: string, dto: CreateAvailabilityConfigDto) {
        return this.prisma.availabilityConfig.create({
            data: {
                organizationId,
                ...dto,
            },
        });
    }

    async deleteConfig(organizationId: string, id: string) {
        return this.prisma.availabilityConfig.deleteMany({
            where: { id, organizationId },
        });
    }

    async getConfigs(organizationId: string) {
        return this.prisma.availabilityConfig.findMany({
            where: { organizationId },
        });
    }

    async getAvailableSlots(organizationId: string, dateStr: string, reason: AppointmentReason): Promise<string[]> {
        // Parse date as UTC to avoid timezone shifts with YYYY-MM-DD strings
        const date = new Date(dateStr + 'T00:00:00Z');
        const dayOfWeek = date.getUTCDay();

        const configs = await this.prisma.availabilityConfig.findMany({
            where: {
                organizationId,
                reason,
                dayOfWeek,
            },
        });

        if (configs.length === 0) {
            return [];
        }

        const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
        const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));

        const existingAppointments = await this.prisma.appointment.findMany({
            where: {
                organizationId,
                reason,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: { not: 'CANCELLED' },
            },
            select: { date: true },
        });

        const bookedTimes = existingAppointments.map(a => {
            const hours = a.date.getUTCHours().toString().padStart(2, '0');
            const minutes = a.date.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        });

        const slots: string[] = [];
        for (const config of configs) {
            let current = this.parseTime(config.startTime);
            const end = this.parseTime(config.endTime);

            while (current < end) {
                const timeStr = this.formatTime(current);
                if (!bookedTimes.includes(timeStr)) {
                    slots.push(timeStr);
                }
                current += config.slotDuration;
            }
        }

        return slots;
    }

    private parseTime(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private formatTime(minutesTotal: number): string {
        const hours = Math.floor(minutesTotal / 60);
        const minutes = minutesTotal % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    async validateSlot(organizationId: string, date: Date, reason: AppointmentReason) {
        const slots = await this.getAvailableSlots(
            organizationId,
            date.toISOString().split('T')[0],
            reason
        );

        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const requestedTime = `${hours}:${minutes}`;

        if (!slots.includes(requestedTime)) {
            throw new BadRequestException(`El horario ${requestedTime} no está disponible para ${reason}`);
        }
    }
}
