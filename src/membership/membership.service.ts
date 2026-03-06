import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MembershipStatus } from '@prisma/client';
import { AuditAction } from '../common/enums';

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

    async findAll(organizationId: string, status?: MembershipStatus) {
        return this.prisma.membership.findMany({
            where: {
                organizationId,
                ...(status && { status }),
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
        return this.findAll(organizationId, 'PENDING');
    }

    async approve(organizationId: string, id: string, adminId: string, data: { minutesBookEntry?: string, memberNumber?: string }) {
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
                    status: 'APPROVED',
                    approvedAt: new Date(),
                    approvedById: adminId,
                    minutesBookEntry: data.minutesBookEntry,
                    memberNumber: data.memberNumber,
                },
                include: { user: true }
            });

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

    async signDocument(userId: string, organizationId: string, type: 'application' | 'consent', ip: string) {
        const membership = await this.prisma.membership.findFirst({
            where: { userId, organizationId }
        });

        if (!membership) throw new NotFoundException('Membresía no encontrada');

        return this.prisma.membership.update({
            where: { id: membership.id },
            data: {
                ...(type === 'application' && { applicationSignedAt: new Date() }),
                ...(type === 'consent' && { dataConsentAcceptedAt: new Date() }),
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
