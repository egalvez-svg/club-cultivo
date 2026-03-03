import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';
import { LotsService } from '../lots/lots.service';

@Injectable()
export class ProductsService {
    constructor(
        private prisma: PrismaService,
        private lotsService: LotsService,
    ) { }

    async create(organizationId: string, createDto: CreateProductDto) {
        const { productionLotId, ...productData } = createDto;

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    organizationId,
                    ...productData,
                    lots: productionLotId ? {
                        connect: { id: productionLotId }
                    } : undefined
                },
                include: {
                    strain: true,
                    lots: true,
                }
            });

            if (productionLotId && productData.currentStock && productData.currentStock > 0) {
                const totalGramsToDeduct = productData.currentStock * productData.equivalentDryGrams;
                await this.lotsService.updateLotBalance(productionLotId, totalGramsToDeduct, tx);
            }

            return product;
        });
    }

    async findAll(organizationId: string) {
        return this.prisma.product.findMany({
            where: { organizationId, active: true },
            include: {
                strain: true, // Incluimos la Info de la Cepa para el Front
                lots: { // Incluimos los lotes disponibles para dispensar
                    where: { status: 'RELEASED' },
                    select: { id: true, lotCode: true, totalOutputEquivalentGrams: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(organizationId: string, id: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId, active: true },
            include: {
                strain: true,
            }
        });

        if (!product) {
            throw new NotFoundException(`Producto no encontrado`);
        }

        return product;
    }

    async update(organizationId: string, id: string, updateDto: UpdateProductDto) {
        await this.findOne(organizationId, id); // Verify it exists

        const { productionLotId, ...productData } = updateDto;

        return this.prisma.product.update({
            where: { id },
            data: {
                ...productData,
                ...(productionLotId && {
                    lots: {
                        connect: { id: productionLotId }
                    }
                })
            },
            include: { strain: true }
        });
    }

    async remove(organizationId: string, id: string) {
        await this.findOne(organizationId, id); // Verify it exists

        return this.prisma.product.update({
            where: { id },
            data: { active: false },
        });
    }

    async decrementStock(productId: string, quantity: number, tx: any) {
        return tx.product.update({
            where: { id: productId },
            data: {
                currentStock: {
                    decrement: quantity
                }
            }
        });
    }
}
