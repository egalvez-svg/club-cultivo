import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipStatus } from '@prisma/client';
import { AuditAction, RoleName, SignatureType } from '../common/enums';
import { ApproveMembershipDto } from './dto/membership.dto';

@Injectable()
export class MembershipService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async findByUser(userId: string, organizationId: string) {
        return this.prisma.membership.findFirst({
            where: { userId, organizationId }
        });
    }

    async findAll(organizationId: string, status?: MembershipStatus | MembershipStatus[]) {
        return this.prisma.membership.findMany({
            where: {
                organizationId,
                ...(status && {
                    status: Array.isArray(status) ? { in: status } : status
                }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        documentNumber: true,
                        email: true,
                    }
                },
                approvedBy: {
                    select: {
                        fullName: true
                    }
                }
            },
            orderBy: { applicationDate: 'desc' },
        });
    }

    async findPending(organizationId: string) {
        return this.findAll(organizationId, ['PENDING', 'REJECTED']);
    }

    async countPending(organizationId: string): Promise<number> {
        return this.prisma.membership.count({
            where: {
                organizationId,
                status: 'PENDING'
            }
        });
    }

    async approve(organizationId: string, id: string, adminId: string, data: ApproveMembershipDto) {
        const membership = await this.prisma.membership.findFirst({
            where: { id, organizationId },
            include: { user: { include: { userRoles: { include: { role: true } } } } }
        });

        if (!membership) {
            throw new NotFoundException('Solicitud de membresía no encontrada');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.membership.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date(),
                    approvedById: adminId,
                    minutesBookEntry: data.minutesBookEntry,
                    memberNumber: data.memberNumber,
                },
                include: { user: true }
            });

            // Reactivate the user in case they were previously rejected/deactivated
            await tx.user.update({
                where: { id: updated.userId },
                data: { active: true }
            });

            // Role assignment: find PATIENT role
            const patientRole = await tx.role.findFirst({ where: { name: RoleName.PATIENT } });
            if (patientRole) {
                const applicantRole = membership.user.userRoles.find(ur => ur.role.name === RoleName.APPLICANT);
                if (applicantRole) {
                    await tx.userRole.delete({
                        where: { id: applicantRole.id }
                    });
                }

                // Add PATIENT role
                await tx.userRole.upsert({
                    where: { userId_roleId: { userId: membership.userId, roleId: patientRole.id } },
                    create: { userId: membership.userId, roleId: patientRole.id, isDefault: true },
                    update: { isDefault: true }
                });
            }

            // Update pending Reprocan records to ACTIVE or create new if provided
            if (data.reprocanNumber) {
                const existing = await tx.reprocanRecord.findFirst({
                    where: { patientId: membership.userId, status: 'PENDING_VALIDATION' }
                });
                if (existing) {
                    await tx.reprocanRecord.update({
                        where: { id: existing.id },
                        data: {
                            status: 'ACTIVE',
                            reprocanNumber: data.reprocanNumber,
                            expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null
                        }
                    });
                } else {
                    await tx.reprocanRecord.create({
                        data: {
                            patientId: membership.userId,
                            reprocanNumber: data.reprocanNumber,
                            expirationDate: data.reprocanExpiration ? new Date(data.reprocanExpiration) : null,
                            status: 'ACTIVE'
                        }
                    });
                }
            } else {
                await tx.reprocanRecord.updateMany({
                    where: { patientId: membership.userId, status: 'PENDING_VALIDATION' },
                    data: { status: 'ACTIVE' }
                });
            }

            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Membership',
                entityId: id,
                action: AuditAction.MEMBERSHIP_APPROVED,
                newData: updated,
                performedById: adminId,
            }, tx);

            return updated;
        });
    }

    async getLegalTexts(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true }
        });
        const name = user?.fullName || '[Nombre]';
        const dni = user?.documentNumber || '[DNI]';
        const orgName = user?.organization?.name || 'la Asociación Civil';

        return {
            application: {
                title: 'SOLICITUD DE INGRESO COMO ASOCIADO',
                content: `Yo, ${name}, DNI Nº ${dni}, solicito formalmente mi incorporación como asociado/a a la Asociación Civil ${orgName}. Declaro haber leído y aceptar el Estatuto Social y Reglamento Interno, solicitando acceso a los fines sociales vinculados al acompañamiento y provisión de preparados a base de cannabis. Cuento con indicación médica y registro en REPROCANN.`
            },
            dataConsent: {
                title: 'CONSENTIMIENTO INFORMADO – DATOS PERSONALES',
                content: `En cumplimiento de la Ley 25.326, el/la solicitante ${name}, presta consentimiento para que la Asociación Civil ${orgName} recolecte mis datos personales y sensibles vinculados a mi salud exclusivamente para fines estatutarios, garantizando su almacenamiento seguro y no cesión a terceros.`
            }
        };
    }

    async signDocument(userId: string, organizationId: string, type: SignatureType, ip: string) {
        const membership = await this.prisma.membership.findFirst({
            where: { userId, organizationId }
        });

        if (!membership) throw new NotFoundException('Membresía no encontrada');

        return this.prisma.membership.update({
            where: { id: membership.id },
            data: {
                ...(type === SignatureType.APPLICATION && { applicationSignedAt: new Date() }),
                ...(type === SignatureType.CONSENT && { dataConsentAcceptedAt: new Date() }),
                signatureIp: ip,
                signatureMetadata: { userAgent: 'Browser Acceptance' }
            }
        });
    }

    async reject(organizationId: string, id: string, adminId: string) {
        const membership = await this.prisma.membership.findFirst({
            where: { id, organizationId }
        });

        if (!membership) {
            throw new NotFoundException('Solicitud de membresía no encontrada');
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.membership.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                }
            });

            // Deactivate the user associated with this membership
            await tx.user.update({
                where: { id: membership.userId },
                data: { active: false }
            });

            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Membership',
                entityId: id,
                action: AuditAction.MEMBERSHIP_REJECTED,
                newData: updated,
                performedById: adminId,
            }, tx);

            return updated;
        });
    }
}
