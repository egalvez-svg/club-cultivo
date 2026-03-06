import { Injectable, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RolesService } from '../roles/roles.service';
import { ReprocanService } from '../reprocan/reprocan.service';
import { AuditService } from '../audit/audit.service';
import { RoleName, AuditAction } from '../common/enums';

const DEFAULT_PASSWORD = process.env.PATIENT_DEFAULT_PASSWORD || 'bienvenidoalClub123!';

@Injectable()
export class PatientsService {
    constructor(
        private prisma: PrismaService,
        private rolesService: RolesService,
        private reprocanService: ReprocanService,
        private auditService: AuditService,
    ) { }

    private async getPatientRoleId() {
        const role = await this.prisma.role.findFirst({
            where: { name: RoleName.PATIENT },
        });
        if (!role) {
            // This case should be rare if seed is run, but keep for safety
            throw new NotFoundException('Rol PATIENT no encontrado');
        }
        return role.id;
    }

    async checkByDocument(organizationId: string, documentNumber: string) {
        const user = await this.prisma.user.findFirst({
            where: { organizationId, documentNumber },
            include: {
                userRoles: { include: { role: true } },
                membership: true,
                reprocanRecords: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
        });

        if (!user) {
            return { exists: false };
        }

        const { passwordHash, hashedRefreshToken, resetPasswordToken, resetPasswordExpires, userRoles, reprocanRecords, membership, ...rest } = user as any;

        const activeReprocan = reprocanRecords?.[0];

        return {
            exists: true,
            ...rest,
            reprocanNumber: activeReprocan?.reprocanNumber || null,
            reprocanExpiration: activeReprocan?.expirationDate || null,
            reprocanStatus: activeReprocan?.status || null,
            membershipStatus: membership?.status || null,
            memberNumber: membership?.memberNumber || null,
            minutesBookEntry: membership?.minutesBookEntry || null,
            roles: user.userRoles.map(ur => ur.role.name),
        };
    }

    async create(organizationId: string, data: any, userId: string) {
        const roleId = await this.getPatientRoleId();

        const existing = await this.prisma.user.findFirst({
            where: {
                organizationId,
                documentNumber: data.documentNumber,
            },
            include: { userRoles: { include: { role: true } } },
        });

        // Si ya existe y ya tiene rol PATIENT, error
        if (existing) {
            const hasPatientRole = existing.userRoles.some(ur => ur.role.name === RoleName.PATIENT);
            if (hasPatientRole) {
                throw new ConflictException('Este usuario ya está registrado como paciente');
            }

            // Si existe pero NO tiene rol PATIENT (es operario), le agregamos el rol
            return this.prisma.$transaction(async (tx) => {
                // 1. Asignar rol usando RolesService
                await this.rolesService.assignRole(existing.id, roleId, false, tx);

                const updatedUser = await tx.user.update({
                    where: { id: existing.id },
                    data: {
                        dailyDose: data.dailyDose ?? existing.dailyDose,
                        address: data.address ?? existing.address,
                        phone: data.phone ?? existing.phone,
                    },
                    include: { userRoles: { include: { role: true } } },
                });

                // 2. Si manda reprocan, usar ReprocanService
                if (data.reprocanNumber) {
                    await this.reprocanService.createRecord({
                        patientId: existing.id,
                        reprocanNumber: data.reprocanNumber,
                        expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null,
                        status: 'ACTIVE'
                    }, tx);
                }

                // 3. Auditoría usando AuditService
                await this.auditService.recordEvent({
                    organizationId,
                    entityType: 'Patient',
                    entityId: existing.id,
                    action: AuditAction.ADD_PATIENT_ROLE,
                    newData: updatedUser,
                    performedById: userId,
                }, tx);

                return updatedUser;
            });
        }

        // Si no existe, crear usuario nuevo con rol PATIENT
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        return this.prisma.$transaction(async (tx) => {
            const patient = await tx.user.create({
                data: {
                    fullName: data.fullName,
                    documentNumber: data.documentNumber,
                    email: data.email || null,
                    passwordHash: hashedPassword,
                    dailyDose: data.dailyDose,
                    address: data.address || null,
                    phone: data.phone || null,
                    organizationId,
                    requiresPasswordChange: true,
                    userRoles: {
                        create: { roleId, isDefault: true },
                    },
                    membership: {
                        create: {
                            organizationId,
                            status: 'PENDING',
                        }
                    },
                    ...(data.reprocanNumber && {
                        reprocanRecords: {
                            create: {
                                reprocanNumber: data.reprocanNumber,
                                expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null,
                                status: 'ACTIVE'
                            }
                        }
                    })
                },
                include: { userRoles: { include: { role: true } } },
            });

            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Patient',
                entityId: patient.id,
                action: AuditAction.CREATE_PATIENT,
                newData: patient,
                performedById: userId,
            }, tx);

            return patient;
        });
    }

    async findAll(organizationId: string) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const patients = await this.prisma.user.findMany({
            where: {
                organizationId,
                userRoles: { some: { role: { name: RoleName.PATIENT } } }
            },
            include: {
                dispensations: {
                    where: {
                        status: 'CONFIRMED',
                        createdAt: { gte: startOfDay, lte: endOfDay },
                    },
                    select: { totalEquivalentGrams: true },
                },
                userRoles: { include: { role: true } },
                membership: true,
                reprocanRecords: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { fullName: 'asc' },
        });

        return patients.map(patient => {
            const dailyConsumption = patient.dispensations.reduce(
                (sum, d) => sum + d.totalEquivalentGrams, 0,
            );
            const { dispensations, passwordHash, hashedRefreshToken, userRoles, reprocanRecords, ...rest } = patient as any;
            const activeReprocan = reprocanRecords?.[0];

            return {
                ...rest,
                roles: patient.userRoles.map(ur => ur.role.name),
                dailyConsumption: Math.round(dailyConsumption * 100) / 100,
                reprocanNumber: activeReprocan?.reprocanNumber || null,
                reprocanExpiration: activeReprocan?.expirationDate || null,
                reprocanStatus: activeReprocan?.status || null,
                membershipStatus: rest.membership?.status || null,
                memberNumber: rest.membership?.memberNumber || null,
                minutesBookEntry: rest.membership?.minutesBookEntry || null,
                address: patient.address || null,
                phone: patient.phone || null,
                applicationSignedAt: rest.membership?.applicationSignedAt || null,
                dataConsentAcceptedAt: rest.membership?.dataConsentAcceptedAt || null,
            };
        });
    }

    async findOne(organizationId: string, id: string) {
        const patient = await this.prisma.user.findFirst({
            where: {
                id,
                organizationId,
                userRoles: { some: { role: { name: RoleName.PATIENT } } }
            },
            include: {
                userRoles: { include: { role: true } },
                membership: true,
                reprocanRecords: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
        });

        if (!patient) {
            throw new NotFoundException('Paciente no encontrado');
        }

        const { passwordHash, hashedRefreshToken, reprocanRecords, membership, ...rest } = patient as any;
        const activeReprocan = reprocanRecords?.[0];

        return {
            ...rest,
            reprocanNumber: activeReprocan?.reprocanNumber || null,
            reprocanExpiration: activeReprocan?.expirationDate || null,
            reprocanStatus: activeReprocan?.status || null,
            membershipStatus: membership?.status || null,
            memberNumber: membership?.memberNumber || null,
            minutesBookEntry: membership?.minutesBookEntry || null,
            address: patient.address || null,
            phone: patient.phone || null,
            applicationSignedAt: membership?.applicationSignedAt || null,
            dataConsentAcceptedAt: membership?.dataConsentAcceptedAt || null,
        };
    }

    async update(organizationId: string, id: string, data: any, userId: string) {
        const oldPatient = await this.findOne(organizationId, id);

        return this.prisma.$transaction(async (tx) => {
            const updatedPatient = await tx.user.update({
                where: { id },
                data: {
                    fullName: data.fullName,
                    documentNumber: data.documentNumber,
                    email: data.email,
                    dailyDose: data.dailyDose,
                    status: data.status,
                    address: data.address,
                    phone: data.phone,
                },
                include: { reprocanRecords: { where: { status: 'ACTIVE' }, take: 1 } }
            });

            // Update reprocan using ReprocanService
            if (data.reprocanNumber) {
                await this.reprocanService.upsertActiveRecord(id, {
                    reprocanNumber: data.reprocanNumber,
                    expirationDate: data.reprocanExpiration,
                }, tx);
            }

            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Patient',
                entityId: updatedPatient.id,
                action: AuditAction.UPDATE_PATIENT,
                previousData: oldPatient,
                newData: updatedPatient,
                performedById: userId,
            }, tx);

            return updatedPatient;
        });
    }

    async getMyDashboard(organizationId: string, patientId: string) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const patient = await this.prisma.user.findFirst({
            where: {
                id: patientId,
                organizationId,
                userRoles: { some: { role: { name: RoleName.PATIENT } } },
            },
            include: {
                organization: { select: { name: true } },
                reprocanRecords: {
                    where: { status: 'ACTIVE' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                membership: true,
                dispensations: {
                    where: {
                        status: 'CONFIRMED',
                        confirmedAt: { gte: startOfMonth, lte: endOfMonth },
                    },
                    select: { totalEquivalentGrams: true },
                },
                appointments: {
                    where: {
                        status: 'PENDING',
                        date: { gte: now },
                    },
                    orderBy: { date: 'asc' },
                    take: 5,
                },
            },
        });

        if (!patient) {
            throw new NotFoundException('Paciente no encontrado');
        }

        // Consumo mensual
        const consumedThisMonth = patient.dispensations.reduce(
            (sum, d) => sum + d.totalEquivalentGrams, 0,
        );
        const monthlyAllowance = (patient.dailyDose || 0) * 30;
        const available = Math.max(0, monthlyAllowance - consumedThisMonth);

        // Ultima dispensacion (fuera del rango mensual)
        const lastDispensation = await this.prisma.dispensation.findFirst({
            where: { recipientId: patientId, status: 'CONFIRMED' },
            orderBy: { confirmedAt: 'desc' },
            select: {
                id: true,
                confirmedAt: true,
                totalEquivalentGrams: true,
                totalRecoveryAmount: true,
                items: {
                    select: { product: { select: { name: true } }, quantityUnits: true },
                },
            },
        });

        // Reprocan
        const reprocan = patient.reprocanRecords[0] || null;
        const daysRemaining = reprocan?.expirationDate
            ? Math.max(0, Math.ceil((reprocan.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;

        return {
            patient: {
                id: patient.id,
                fullName: patient.fullName,
                documentNumber: patient.documentNumber,
                status: patient.status,
                dailyDose: patient.dailyDose,
                applicationSignedAt: patient.membership?.applicationSignedAt || null,
                dataConsentAcceptedAt: patient.membership?.dataConsentAcceptedAt || null,
            },
            organization: {
                name: patient.organization.name,
            },
            reprocan: reprocan ? {
                reprocanNumber: reprocan.reprocanNumber,
                status: reprocan.status,
                expirationDate: reprocan.expirationDate,
                createdAt: reprocan.createdAt,
                daysRemaining,
            } : null,
            consumption: {
                consumedThisMonth: Math.round(consumedThisMonth * 100) / 100,
                monthlyAllowance: Math.round(monthlyAllowance * 100) / 100,
                available: Math.round(available * 100) / 100,
                progressPercent: monthlyAllowance > 0
                    ? Math.round((consumedThisMonth / monthlyAllowance) * 100)
                    : 0,
                lastDispensation: lastDispensation || null,
            },
            pendingAppointments: patient.appointments.map(a => ({
                id: a.id,
                date: a.date,
                reason: a.reason,
                status: a.status,
            })),
        };
    }

    async remove(organizationId: string, id: string, userId: string) {
        const patient = await this.findOne(organizationId, id);

        return this.prisma.$transaction(async (tx) => {
            const updatedPatient = await tx.user.update({
                where: { id },
                data: { status: 'SUSPENDED' },
            });

            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Patient',
                entityId: patient.id,
                action: AuditAction.SUSPEND_PATIENT,
                previousData: patient,
                newData: updatedPatient,
                performedById: userId,
            }, tx);

            return updatedPatient;
        });
    }
}
