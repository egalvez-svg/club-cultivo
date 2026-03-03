import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto, CloseSessionDto, CreateCashMovementDto } from './dto/cash-register.dto';

@Injectable()
export class CashRegisterService {
    constructor(private prisma: PrismaService) { }

    async getActiveSession(organizationId: string) {
        const session = await this.prisma.cashRegisterSession.findFirst({
            where: { organizationId, status: 'OPEN' },
            include: {
                movements: {
                    orderBy: { createdAt: 'desc' },
                    include: { createdBy: { select: { fullName: true } } }
                }
            }
        });

        if (!session) return null;

        // Calcular balance actual
        const income = session.movements
            .filter(m => m.movementType === 'INCOME')
            .reduce((sum, m) => sum + m.amount, 0);
        const expense = session.movements
            .filter(m => m.movementType === 'EXPENSE')
            .reduce((sum, m) => sum + m.amount, 0);

        const currentBalance = session.openingBalance + income - expense;

        return {
            ...session,
            currentBalance,
            totals: { income, expense }
        };
    }

    async openSession(organizationId: string, userId: string, dto: OpenSessionDto) {
        const active = await this.getActiveSession(organizationId);
        if (active) {
            throw new BadRequestException('Ya existe una caja abierta para esta organización');
        }

        return this.prisma.cashRegisterSession.create({
            data: {
                organizationId,
                openedById: userId,
                openingBalance: dto.openingBalance,
                status: 'OPEN',
            }
        });
    }
    async closeSession(organizationId: string, userId: string, dto: CloseSessionDto) {
        const active = await this.getActiveSession(organizationId);
        if (!active) {
            throw new BadRequestException('No hay una caja abierta para cerrar');
        }

        return this.prisma.cashRegisterSession.update({
            where: { id: active.id },
            data: {
                status: 'CLOSED',
                closedById: userId,
                closedAt: new Date(),
                closingBalance: dto.closingBalance,
            }
        });
    }

    async createMovement(organizationId: string, userId: string, dto: CreateCashMovementDto) {
        const active = await this.getActiveSession(organizationId);
        if (!active) {
            throw new BadRequestException('Debe abrir la caja antes de registrar movimientos');
        }

        return this.prisma.cashMovement.create({
            data: {
                organizationId,
                sessionId: active.id,
                createdById: userId,
                movementType: dto.movementType,
                amount: dto.amount,
                notes: dto.notes,
                referenceType: dto.referenceType,
                referenceId: dto.referenceId,
            }
        });
    }

    async getRecentSessions(organizationId: string) {
        return this.prisma.cashRegisterSession.findMany({
            where: { organizationId },
            orderBy: { openedAt: 'desc' },
            take: 10,
            include: {
                openedBy: { select: { fullName: true } },
                closedBy: { select: { fullName: true } }
            }
        });
    }

    async recordMovement(data: any, tx: any) {
        return tx.cashMovement.create({
            data
        });
    }
}
