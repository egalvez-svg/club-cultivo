import { Injectable, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RolesService } from '../roles/roles.service';
import { ReprocanService } from '../reprocan/reprocan.service';
import { AuditService } from '../audit/audit.service';

const DEFAULT_PASSWORD = 'bienvenidoalClub123!';

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
            where: { name: 'PATIENT' },
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

        const { passwordHash, hashedRefreshToken, resetPasswordToken, resetPasswordExpires, userRoles, reprocanRecords, ...rest } = user as any;

        const activeReprocan = reprocanRecords?.[0];

        return {
            exists: true,
            ...rest,
            reprocanNumber: activeReprocan?.reprocanNumber || null,
            reprocanExpiration: activeReprocan?.expirationDate || null,
            reprocanStatus: activeReprocan?.status || null,
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
            const hasPatientRole = existing.userRoles.some(ur => ur.role.name === 'PATIENT');
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
                    action: 'ADD_PATIENT_ROLE',
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
                    organizationId,
                    userRoles: {
                        create: { roleId, isDefault: true },
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
                action: 'CREATE_PATIENT',
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
                userRoles: { some: { role: { name: 'PATIENT' } } }
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
            };
        });
    }

    async findOne(organizationId: string, id: string) {
        const patient = await this.prisma.user.findFirst({
            where: {
                id,
                organizationId,
                userRoles: { some: { role: { name: 'PATIENT' } } }
            },
            include: {
                userRoles: { include: { role: true } },
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

        const { passwordHash, hashedRefreshToken, reprocanRecords, ...rest } = patient as any;
        const activeReprocan = reprocanRecords?.[0];

        return {
            ...rest,
            reprocanNumber: activeReprocan?.reprocanNumber || null,
            reprocanExpiration: activeReprocan?.expirationDate || null,
            reprocanStatus: activeReprocan?.status || null,
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
                action: 'UPDATE_PATIENT',
                previousData: oldPatient,
                newData: updatedPatient,
                performedById: userId,
            }, tx);

            return updatedPatient;
        });
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
                action: 'SUSPEND_PATIENT',
                previousData: patient,
                newData: updatedPatient,
                performedById: userId,
            }, tx);

            return updatedPatient;
        });
    }
}
