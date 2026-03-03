import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispensationDto } from './dto/create-dispensation.dto';
import { Prisma } from '@prisma/client';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { LotsService } from '../lots/lots.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class DispensationsService {
    constructor(
        private prisma: PrismaService,
        private cashRegisterService: CashRegisterService,
        private usersService: UsersService,
        private productsService: ProductsService,
        private lotsService: LotsService,
        private paymentsService: PaymentsService,
    ) { }

    async create(organizationId: string, performedById: string, createDto: CreateDispensationDto) {
        if (!createDto.items || createDto.items.length === 0) {
            throw new BadRequestException('La dispensación debe tener al menos un item');
        }

        // Calcular totales
        const totalEquivalentGrams = createDto.items.reduce((sum, item) => sum + item.equivalentDryGrams, 0);
        const subtotalRecovery = createDto.items.reduce((sum, item) => sum + item.totalRecoveryAmount, 0);
        const totalRecoveryAmount = Math.max(0, subtotalRecovery - (createDto.discount || 0));

        // Ejecutar transacción
        return this.prisma.$transaction(async (prisma) => {
            // 1. Crear Dispensa
            const dispensation = await prisma.dispensation.create({
                data: {
                    organizationId,
                    recipientId: createDto.recipientId,
                    performedById,
                    status: 'CONFIRMED',
                    totalEquivalentGrams,
                    totalRecoveryAmount,
                    confirmedAt: new Date(),

                    // 2. Crear Items
                    items: {
                        create: createDto.items.map(item => ({
                            productId: item.productId,
                            productionLotId: item.productionLotId,
                            quantityUnits: item.quantityUnits,
                            equivalentDryGrams: item.equivalentDryGrams,
                            costPerEquivalentGram: item.costPerEquivalentGram,
                            totalRecoveryAmount: item.totalRecoveryAmount,
                        }))
                    },

                    // 3. Crear el Pago asociado usando el PaymentsService
                    payments: {
                        create: [{
                            organizationId,
                            userId: createDto.recipientId,
                            amount: totalRecoveryAmount,
                            status: 'PAID',
                            paymentMethod: createDto.paymentMethod,
                            receivedById: performedById,
                            paidAt: new Date(),
                        }]
                    }
                },
                include: {
                    items: true,
                    payments: true,
                    recipient: {
                        select: { fullName: true, documentNumber: true, reprocanRecords: { where: { status: 'ACTIVE' } } }
                    },
                    performedBy: {
                        select: { fullName: true }
                    }
                }
            });

            // 4. Descontar Inventario y Registrar Movimientos usando los Services correspondientes
            for (const item of createDto.items) {
                // A) Descontar del Producto Unitario (Frascos/Gramos)
                await this.productsService.decrementStock(item.productId, item.quantityUnits, prisma);

                // B) Registrar el Movimiento en el Libro Mayor del Lote
                await this.lotsService.createStockMovement({
                    organizationId,
                    productionLotId: item.productionLotId,
                    movementType: 'DISPENSATION',
                    quantityEquivalentGrams: -item.equivalentDryGrams,
                    referenceType: 'DISPENSATION',
                    referenceId: dispensation.id,
                    createdById: performedById
                }, prisma);
            }

            // 5. Registrar en Caja si el pago fue en efectivo y hay caja abierta usando CashRegisterService
            if (createDto.paymentMethod === 'CASH') {
                const activeSession = await this.cashRegisterService.getActiveSession(organizationId);
                if (activeSession) {
                    await this.cashRegisterService.recordMovement({
                        organizationId,
                        sessionId: activeSession.id,
                        movementType: 'INCOME',
                        amount: totalRecoveryAmount,
                        notes: `Dispensación #${dispensation.id.substring(0, 8)}`,
                        referenceType: 'DISPENSATION',
                        referenceId: dispensation.id,
                        createdById: performedById,
                    }, prisma);
                }
            }

            return dispensation;
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.dispensation.findMany({
            where: { organizationId },
            include: {
                recipient: { select: { fullName: true, documentNumber: true } },
                performedBy: { select: { fullName: true } },
                _count: { select: { items: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(organizationId: string, id: string) {
        return this.prisma.dispensation.findFirst({
            where: { organizationId, id },
            include: {
                items: {
                    include: { product: true, productionLot: { include: { strain: true } } }
                },
                payments: true,
                recipient: { select: { fullName: true, documentNumber: true } },
                performedBy: { select: { fullName: true } }
            }
        });
    }

    async getGramsSum(organizationId: string, gte: Date, lte?: Date) {
        const result = await this.prisma.dispensation.aggregate({
            where: {
                organizationId,
                status: 'CONFIRMED',
                confirmedAt: { gte, ...(lte && { lte }) }
            },
            _sum: { totalEquivalentGrams: true }
        });
        return result._sum.totalEquivalentGrams || 0;
    }

    async getRecent(organizationId: string, take: number) {
        return this.prisma.dispensation.findMany({
            where: { organizationId, status: 'CONFIRMED' },
            take,
            orderBy: { confirmedAt: 'desc' },
            include: {
                recipient: { select: { fullName: true } },
                items: {
                    include: { product: { select: { name: true } } }
                }
            }
        });
    }
}
