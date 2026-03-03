import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'bienvenidoalClub123!';

@Injectable()
export class PatientsService {
    constructor(private prisma: PrismaService) { }

    private async getPatientRoleId() {
        const role = await this.prisma.role.findFirst({
            where: { name: 'PATIENT' }
        });
        if (!role) {
            return (await this.prisma.role.create({
                data: { name: 'PATIENT' }
            })).id;
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
                await tx.userRole.create({
                    data: { userId: existing.id, roleId },
                });

                const updatedUser = await tx.user.update({
                    where: { id: existing.id },
                    data: {
                        dailyDose: data.dailyDose ?? existing.dailyDose,
                    },
                    include: { userRoles: { include: { role: true } } },
                });

                // Si manda reprocan en la peticion de operario a paciente, lo agregamos
                if (data.reprocanNumber) {
                    await tx.reprocanRecord.create({
                        data: {
                            patientId: existing.id,
                            reprocanNumber: data.reprocanNumber,
                            expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null,
                            status: 'ACTIVE'
                        }
                    });
                }

                await tx.auditEvent.create({
                    data: {
                        organizationId,
                        entityType: 'Patient',
                        entityId: existing.id,
                        action: 'ADD_PATIENT_ROLE',
                        newData: JSON.parse(JSON.stringify(updatedUser)),
                        performedById: userId,
                    },
                });

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

            await tx.auditEvent.create({
                data: {
                    organizationId,
                    entityType: 'Patient',
                    entityId: patient.id,
                    action: 'CREATE_PATIENT',
                    newData: JSON.parse(JSON.stringify(patient)),
                    performedById: userId,
                },
            });

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

            // Update reprocan if sent in update (retro-compatibility frontend ease)
            if (data.reprocanNumber) {
                const activeReprocan = updatedPatient.reprocanRecords?.[0];
                if (activeReprocan) {
                    await tx.reprocanRecord.update({
                        where: { id: activeReprocan.id },
                        data: {
                            reprocanNumber: data.reprocanNumber,
                            expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : activeReprocan.expirationDate
                        }
                    });
                } else {
                    await tx.reprocanRecord.create({
                        data: {
                            patientId: id,
                            reprocanNumber: data.reprocanNumber,
                            expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null,
                            status: 'ACTIVE'
                        }
                    });
                }
            }

            await tx.auditEvent.create({
                data: {
                    organizationId,
                    entityType: 'Patient',
                    entityId: updatedPatient.id,
                    action: 'UPDATE_PATIENT',
                    previousData: JSON.parse(JSON.stringify(oldPatient)),
                    newData: JSON.parse(JSON.stringify(updatedPatient)),
                    performedById: userId,
                },
            });

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

            await tx.auditEvent.create({
                data: {
                    organizationId,
                    entityType: 'Patient',
                    entityId: patient.id,
                    action: 'SUSPEND_PATIENT',
                    previousData: JSON.parse(JSON.stringify(patient)),
                    newData: JSON.parse(JSON.stringify(updatedPatient)),
                    performedById: userId,
                },
            });

            return updatedPatient;
        });
    }
}
