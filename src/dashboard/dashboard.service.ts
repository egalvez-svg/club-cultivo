import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getSummary(organizationId: string) {
        const now = new Date();
        const firstDayCurrentMonth = startOfMonth(now);
        const firstDayLastMonth = startOfMonth(subMonths(now, 1));
        const lastDayLastMonth = endOfMonth(subMonths(now, 1));
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        // 1. KPI: Active Patients
        const totalActivePatients = await this.prisma.user.count({
            where: {
                organizationId,
                status: 'ACTIVE',
                userRoles: { some: { role: { name: 'PATIENT' } } }
            }
        });

        const activePatientsLastMonth = await this.prisma.user.count({
            where: {
                organizationId,
                status: 'ACTIVE',
                userRoles: { some: { role: { name: 'PATIENT' } } },
                createdAt: { lt: firstDayCurrentMonth }
            }
        });
        const patientsGrowth = this.calculateGrowth(totalActivePatients, activePatientsLastMonth);

        // 2. KPI: Grams Dispensed (This Month)
        const gramsCurrentMonth = await this.prisma.dispensation.aggregate({
            where: {
                organizationId,
                status: 'CONFIRMED',
                confirmedAt: { gte: firstDayCurrentMonth }
            },
            _sum: { totalEquivalentGrams: true }
        });

        const gramsLastMonth = await this.prisma.dispensation.aggregate({
            where: {
                organizationId,
                status: 'CONFIRMED',
                confirmedAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
            },
            _sum: { totalEquivalentGrams: true }
        });
        const gramsSum = gramsCurrentMonth._sum.totalEquivalentGrams || 0;
        const gramsGrowth = this.calculateGrowth(gramsSum, gramsLastMonth._sum.totalEquivalentGrams || 0);

        // 3. KPI: Lots in Cultivation
        const lotsCount = await this.prisma.productionLot.count({
            where: {
                organizationId,
                lotType: 'CULTIVATION',
                status: { notIn: ['DEPLETED', 'BLOCKED'] }
            }
        });

        // 4. KPI: Total Revenue (This Month)
        const revenueCurrentMonth = await this.prisma.payment.aggregate({
            where: {
                organizationId,
                status: 'PAID',
                createdAt: { gte: firstDayCurrentMonth }
            },
            _sum: { amount: true }
        });

        const revenueLastMonth = await this.prisma.payment.aggregate({
            where: {
                organizationId,
                status: 'PAID',
                createdAt: { gte: firstDayLastMonth, lte: lastDayLastMonth }
            },
            _sum: { amount: true }
        });
        const revenueSum = revenueCurrentMonth._sum.amount || 0;
        const revenueGrowth = this.calculateGrowth(revenueSum, revenueLastMonth._sum.amount || 0);

        // 5. Recent Dispensations
        const recentDispensations = await this.prisma.dispensation.findMany({
            where: { organizationId, status: 'CONFIRMED' },
            take: 5,
            orderBy: { confirmedAt: 'desc' },
            include: {
                recipient: { select: { fullName: true } },
                items: {
                    include: { product: { select: { name: true } } }
                }
            }
        });

        // 6. Today's Appointments
        const todayAppointments = await this.prisma.appointment.findMany({
            where: {
                organizationId,
                date: { gte: todayStart, lte: todayEnd }
            },
            include: {
                patient: { select: { fullName: true } }
            },
            orderBy: { date: 'asc' }
        });

        return {
            kpis: {
                activePatients: {
                    value: totalActivePatients,
                    growth: patientsGrowth,
                },
                gramsDispensed: {
                    value: gramsSum,
                    growth: gramsGrowth,
                },
                lotsInCultivation: {
                    value: lotsCount,
                },
                totalRevenue: {
                    value: revenueSum,
                    growth: revenueGrowth,
                }
            },
            recentDispensations: recentDispensations.map(d => ({
                id: d.id,
                patientName: d.recipient.fullName,
                description: d.items.length > 0
                    ? d.items.map(i => i.product.name).join(', ')
                    : 'Sin especificar',
                amount: d.totalRecoveryAmount,
                confirmedAt: d.confirmedAt,
                totalEquivalentGrams: d.totalEquivalentGrams,
            })),
            todayAppointments: todayAppointments.map(a => ({
                id: a.id,
                time: a.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                patientName: a.patient.fullName,
                reason: a.reason,
            })),
        };
    }

    private calculateGrowth(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number(((current - previous) / previous * 100).toFixed(1));
    }
}
