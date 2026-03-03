import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentMethod, CashMovementType } from '@prisma/client';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
    constructor(
        private prisma: PrismaService,
        private cashRegisterService: CashRegisterService,
        private auditService: AuditService,
    ) { }

    async findAll(organizationId: string) {
        return this.prisma.payment.findMany({
            where: { organizationId },
            include: { user: true, dispensation: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(organizationId: string, id: string) {
        const payment = await this.prisma.payment.findFirst({
            where: { id, organizationId },
            include: { user: true, dispensation: { include: { items: true } } },
        });
        if (!payment) throw new NotFoundException('Pago no encontrado');
        return payment;
    }

    async registerPayment(organizationId: string, id: string, userId: string, data: { paymentMethod: string, notes?: string }) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({
                where: { id, organizationId },
            });

            if (!payment) throw new NotFoundException('Payment not found');
            if (payment.status === 'PAID') throw new BadRequestException('El pago ya ha sido registrado');

            // 1. Actualizar el pago
            const updatedPayment = await tx.payment.update({
                where: { id },
                data: {
                    status: PaymentStatus.PAID as any,
                    paymentMethod: (data.paymentMethod as PaymentMethod) as any,
                    notes: data.notes,
                    paidAt: new Date(),
                    receivedById: userId,
                } as any,
            });

            // 2. Crear movimiento de caja usando CashRegisterService
            await this.cashRegisterService.recordMovement({
                organizationId,
                movementType: CashMovementType.INCOME,
                amount: payment.amount,
                referenceType: 'PAYMENT',
                referenceId: payment.id,
                createdById: userId,
                notes: `Pago de dispensa - Usuario/Paciente ID: ${payment.userId}`,
            }, tx);

            // 3. Auditoría usando AuditService
            await this.auditService.recordEvent({
                organizationId,
                entityType: 'Payment',
                entityId: payment.id,
                action: 'REGISTER_PAYMENT',
                previousData: payment,
                newData: updatedPayment,
                performedById: userId,
            }, tx);

            return updatedPayment;
        });
    }

    async createPayment(data: any, tx: any) {
        return tx.payment.create({
            data
        });
    }

    async getTotalRevenue(organizationId: string, gte: Date, lte?: Date) {
        const result = await this.prisma.payment.aggregate({
            where: {
                organizationId,
                status: 'PAID',
                createdAt: { gte, ...(lte && { lte }) }
            },
            _sum: { amount: true }
        });
        return result._sum.amount || 0;
    }
}
