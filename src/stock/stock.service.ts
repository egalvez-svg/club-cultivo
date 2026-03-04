import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovementType } from '@prisma/client';

@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) { }

    async registerMovement(organizationId: string, data: any, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            // Registrar el movimiento en el ledger
            const movement = await tx.stockMovement.create({
                data: {
                    ...data,
                    createdById: userId,
                },
            });

            // Actualizar el stock remanente en el lote (si corresponde)
            // Nota: En el esquema avanzado, ProductionLot no tiene remainingGrams pero 
            // se calcula a partir de los movimientos. Si decidimos mantener stock consolidado
            // en el lote, lo actualizaríamos aquí.

            return movement;
        });
    }

    async getLotHistory(productionLotId: string) {
        return this.prisma.stockMovement.findMany({
            where: { productionLotId },
            include: { createdBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getGlobalLedger(organizationId: string) {
        return this.prisma.stockMovement.findMany({
            where: {
                productionLot: { organizationId }
            },
            include: { productionLot: { include: { products: true } }, createdBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }
}
