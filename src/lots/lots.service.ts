import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLotDto, UpdateLotDto } from './dto/lots.dto';

@Injectable()
export class LotsService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, createDto: CreateLotDto) {
        // Generate a lot code if not provided
        const lotCode = createDto.lotCode || `LOT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        return this.prisma.productionLot.create({
            data: {
                organizationId,
                strainId: createDto.strainId,
                lotType: createDto.lotType,
                lotCode,
                parentLotId: createDto.parentLotId,
                totalOutputEquivalentGrams: createDto.totalOutputEquivalentGrams || 0,
                availableEquivalentGrams: createDto.totalOutputEquivalentGrams || 0,
                totalProductionCost: createDto.totalProductionCost || 0,
                status: createDto.status || 'CREATED',
            },
            include: {
                strain: true,
            }
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.productionLot.findMany({
            where: { organizationId },
            include: {
                strain: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(organizationId: string, id: string) {
        const lot = await this.prisma.productionLot.findFirst({
            where: { id, organizationId },
            include: {
                strain: true,
                parentLot: true,
                childLots: true,
            }
        });

        if (!lot) {
            throw new NotFoundException(`Lote de producción no encontrado`);
        }

        return lot;
    }

    async findByStrain(organizationId: string, strainId: string) {
        return this.prisma.productionLot.findMany({
            where: {
                organizationId,
                strainId,
                status: 'RELEASED'
            },
            select: {
                id: true,
                lotCode: true,
                totalOutputEquivalentGrams: true,
                availableEquivalentGrams: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(organizationId: string, id: string, updateDto: UpdateLotDto) {
        await this.findOne(organizationId, id); // Verify it exists and belongs to org

        if (updateDto.status === 'RELEASED') {
            const updateData: any = { status: updateDto.status, releasedAt: new Date() };
            if (updateDto.totalOutputEquivalentGrams !== undefined) {
                updateData.totalOutputEquivalentGrams = updateDto.totalOutputEquivalentGrams;
                updateData.availableEquivalentGrams = updateDto.totalOutputEquivalentGrams;
            }
            if (updateDto.totalProductionCost !== undefined) updateData.totalProductionCost = updateDto.totalProductionCost;

            return this.prisma.productionLot.update({
                where: { id },
                data: updateData,
                include: { strain: true }
            });
        }

        return this.prisma.productionLot.update({
            where: { id },
            data: updateDto,
            include: { strain: true }
        });
    }

    async remove(organizationId: string, id: string) {
        const lot = await this.findOne(organizationId, id);

        // Solo permitir borrar si esta CREATED
        if (lot.status !== 'CREATED') {
            throw new Error('Solo se pueden eliminar lotes en estado CREATED');
        }

        return this.prisma.productionLot.delete({
            where: { id },
        });
    }

    async createStockMovement(data: any, tx: any) {
        return tx.stockMovement.create({
            data
        });
    }

    async updateLotBalance(id: string, gramsToDeduct: number, tx: any) {
        const lot = await tx.productionLot.findUnique({
            where: { id }
        });

        if (!lot) return null;

        const newBalance = lot.availableEquivalentGrams - gramsToDeduct;
        return tx.productionLot.update({
            where: { id },
            data: {
                availableEquivalentGrams: newBalance,
                status: newBalance <= 0 ? 'DEPLETED' : lot.status,
            }
        });
    }

    async countActiveCultivationLots(organizationId: string) {
        return this.prisma.productionLot.count({
            where: {
                organizationId,
                lotType: 'CULTIVATION',
                status: { notIn: ['DEPLETED', 'BLOCKED'] }
            }
        });
    }
}
