import { Injectable } from '@nestjs/common';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { UsersService } from '../users/users.service';
import { DispensationsService } from '../dispensations/dispensations.service';
import { LotsService } from '../lots/lots.service';
import { PaymentsService } from '../payments/payments.service';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class DashboardService {
    constructor(
        private usersService: UsersService,
        private dispensationsService: DispensationsService,
        private lotsService: LotsService,
        private paymentsService: PaymentsService,
        private appointmentsService: AppointmentsService
    ) { }

    async getSummary(organizationId: string) {
        const now = new Date();
        const firstDayCurrentMonth = startOfMonth(now);
        const firstDayLastMonth = startOfMonth(subMonths(now, 1));
        const lastDayLastMonth = endOfMonth(subMonths(now, 1));
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));

        // 1. KPI: Active Patients
        const totalActivePatients = await this.usersService.countActivePatients(organizationId);
        const activePatientsLastMonth = await this.usersService.countActivePatients(organizationId, firstDayCurrentMonth);
        const patientsGrowth = this.calculateGrowth(totalActivePatients, activePatientsLastMonth);

        // 2. KPI: Grams Dispensed (This Month)
        const gramsCurrentMonth = await this.dispensationsService.getGramsSum(organizationId, firstDayCurrentMonth);
        const gramsLastMonth = await this.dispensationsService.getGramsSum(organizationId, firstDayLastMonth, lastDayLastMonth);
        const gramsGrowth = this.calculateGrowth(gramsCurrentMonth, gramsLastMonth);

        // 3. KPI: Lots in Cultivation
        const lotsCount = await this.lotsService.countActiveCultivationLots(organizationId);

        // 4. KPI: Total Revenue (This Month)
        const revenueCurrentMonth = await this.paymentsService.getTotalRevenue(organizationId, firstDayCurrentMonth);
        const revenueLastMonth = await this.paymentsService.getTotalRevenue(organizationId, firstDayLastMonth, lastDayLastMonth);
        const revenueGrowth = this.calculateGrowth(revenueCurrentMonth, revenueLastMonth);

        // 5. Recent Dispensations
        const recentDispensations = await this.dispensationsService.getRecent(organizationId, 5);

        // 6. Today's Appointments
        const todayAppointments = await this.appointmentsService.findToday(organizationId, todayStart, todayEnd);

        return {
            kpis: {
                activePatients: {
                    value: totalActivePatients,
                    growth: patientsGrowth,
                },
                gramsDispensed: {
                    value: gramsCurrentMonth,
                    growth: gramsGrowth,
                },
                lotsInCultivation: {
                    value: lotsCount,
                },
                totalRevenue: {
                    value: revenueCurrentMonth,
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
