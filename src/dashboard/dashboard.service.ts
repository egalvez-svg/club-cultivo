import { Injectable } from '@nestjs/common';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { UsersService } from '../users/users.service';
import { DispensationsService } from '../dispensations/dispensations.service';
import { LotsService } from '../lots/lots.service';
import { PaymentsService } from '../payments/payments.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName, AuditAction, SYSTEM_ORGANIZATION } from '../common/enums';

@Injectable()
export class DashboardService {
    constructor(
        private prisma: PrismaService,
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
                patientName: a.patient?.fullName || a.guestName,
                reason: a.reason,
            })),
        };
    }

    async getSuperAdminSummary() {
        const now = new Date();
        const firstDayCurrentMonth = startOfMonth(now);

        // 1. Total Organizations (Active and not SYSTEM)
        const totalOrgs = await this.prisma.organization.count({
            where: { active: true, NOT: { name: SYSTEM_ORGANIZATION } }
        });
        const orgsLastMonth = await this.prisma.organization.count({
            where: { active: true, NOT: { name: SYSTEM_ORGANIZATION }, createdAt: { lt: firstDayCurrentMonth } }
        });
        const orgsGrowth = this.calculateGrowth(totalOrgs, orgsLastMonth);

        // 2. Total Users (Active)
        const totalUsers = await this.prisma.user.count({
            where: { active: true, organization: { NOT: { name: SYSTEM_ORGANIZATION } } }
        });
        const usersLastMonth = await this.prisma.user.count({
            where: { active: true, organization: { NOT: { name: SYSTEM_ORGANIZATION } }, createdAt: { lt: firstDayCurrentMonth } }
        });
        const usersGrowth = this.calculateGrowth(totalUsers, usersLastMonth);

        // 3. Active Strains
        const activeStrains = await this.prisma.strain.count({
            where: { active: true }
        });

        return {
            kpis: {
                organizations: {
                    value: totalOrgs,
                    growth: orgsGrowth
                },
                totalUsers: {
                    value: totalUsers,
                    growth: usersGrowth
                },
                activeStrains: {
                    value: activeStrains
                },
                systemStatus: {
                    value: 99.9 // Placeholder as in UI
                }
            },
            liveActivity: await this.getLiveActivity()
        };
    }

    async getLiveActivity() {
        const events = await this.prisma.auditEvent.findMany({
            where: {
                action: {
                    in: [AuditAction.ORGANIZATION_CREATED, AuditAction.ORGANIZATION_UPDATED, AuditAction.ROLE_CREATED, AuditAction.ROLE_UPDATED]
                }
            },
            include: {
                performedBy: { select: { fullName: true } }
            },
            orderBy: { performedAt: 'desc' },
            take: 15
        });

        return events.map(event => {
            let message = '';
            const data = (event.newData as any) || {};

            switch (event.action) {
                case AuditAction.ORGANIZATION_CREATED:
                    message = `Nueva organización registrada: ${data.name || 'Desconocida'}`;
                    break;
                case AuditAction.ORGANIZATION_UPDATED:
                    message = `Se actualizaron datos de la organización: ${data.name || 'Desconocida'}`;
                    break;
                case AuditAction.ROLE_CREATED:
                    message = `Nuevo rol creado: ${data.name || 'Sin nombre'}`;
                    break;
                case AuditAction.ROLE_UPDATED:
                    message = `Se actualizó el rol: ${data.name || 'Sin nombre'}`;
                    break;
                default:
                    message = `Actividad en el sistema: ${event.action}`;
            }

            return {
                id: event.id,
                message,
                user: event.performedBy?.fullName || 'Sistema',
                time: event.performedAt
            };
        });
    }

    async getOrganizationsDetailList() {
        const organizations = await this.prisma.organization.findMany({
            where: { active: true, NOT: { name: SYSTEM_ORGANIZATION } },
            include: {
                _count: {
                    select: {
                        users: true,
                        lots: true
                    }
                }
            }
        });

        // We need separate counts for Staff vs Patients
        // To avoid N+1 queries in a simple way, we can use group by or raw SQL, 
        // but for now let's just use prisma counts with a more detailed include if possible.
        // Prisma doesn't support nested conditional counts easily in findMany _count.

        const results = await Promise.all(organizations.map(async (org) => {
            const patientCount = await this.prisma.user.count({
                where: {
                    organizationId: org.id,
                    active: true,
                    userRoles: { some: { role: { name: RoleName.PATIENT } } }
                }
            });

            const staffCount = await this.prisma.user.count({
                where: {
                    organizationId: org.id,
                    active: true,
                    userRoles: { some: { role: { name: { not: RoleName.PATIENT } } } }
                }
            });

            const activeLots = await this.prisma.productionLot.count({
                where: {
                    organizationId: org.id,
                    status: { notIn: ['DEPLETED', 'BLOCKED'] }
                }
            });

            return {
                id: org.id,
                name: org.name,
                plan: "Pro", // Placeholder for UI
                staffCount,
                patientCount,
                lotCount: activeLots,
            };
        }));

        return results;
    }

    private calculateGrowth(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number(((current - previous) / previous * 100).toFixed(1));
    }
}
