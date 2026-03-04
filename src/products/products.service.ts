import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LotsService } from '../lots/lots.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
                    select: { id: true, lotCode: true, totalOutputEquivalentGrams: true, availableEquivalentGrams: true }
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
        const existingProduct = await this.findOne(organizationId, id); // Verify it exists

        const { productionLotId, currentStock, ...productData } = updateDto;

        return this.prisma.$transaction(async (tx) => {
            // Actualizamos los datos básicos del producto
            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    ...productData,
                    // Actualizamos stock si lo enviaron en el DTO
                    ...(currentStock !== undefined && { currentStock }),
                    ...(productionLotId && {
                        lots: {
                            connect: { id: productionLotId }
                        }
                    })
                },
                include: { strain: true, lots: true }
            });

            // Si el front mandó currentStock, y es diferente al actual, calculamos la diferencia y restamos del lote
            if (currentStock !== undefined && currentStock !== existingProduct.currentStock) {
                const stockDifference = currentStock - existingProduct.currentStock;

                // Solo si la diferencia es positiva (añadieron stock a la vitrina), cobramos esos gramos al lote
                if (stockDifference > 0) {
                    let lotToDeduct = productionLotId;

                    if (!lotToDeduct) {
                        // Buscamos un lote activo (RELEASED) asociado a este producto que todavía tenga gramos (FIFO)
                        const activeLot = await tx.productionLot.findFirst({
                            where: {
                                products: { some: { id } },
                                status: 'RELEASED',
                                availableEquivalentGrams: { gt: 0 },
                            },
                            orderBy: { createdAt: 'asc' }, // El más viejo primero
                        });

                        // Si hay uno liberado usamos ese, si no renegamos a usar el último asignado (aunque esté agotado)
                        lotToDeduct = activeLot?.id || (updatedProduct.lots.length > 0 ? updatedProduct.lots[updatedProduct.lots.length - 1].id : undefined);
                    }

                    if (!lotToDeduct) {
                        throw new NotFoundException(`No se puede aumentar el stock manual sin un lote de producción asignado.`);
                    }

                    const equivalentGramsRate = productData.equivalentDryGrams !== undefined ? productData.equivalentDryGrams : existingProduct.equivalentDryGrams;
                    const totalGramsToDeduct = stockDifference * equivalentGramsRate;

                    await this.lotsService.updateLotBalance(lotToDeduct as string, totalGramsToDeduct, tx);
                }
            }

            return updatedProduct;
        });
    }

    async remove(organizationId: string, id: string) {
        const product = await this.findOne(organizationId, id); // Verify it exists

        return this.prisma.$transaction(async (tx) => {
            // Soft delete
            const deletedProduct = await tx.product.update({
                where: { id },
                data: { active: false },
                include: { lots: true },
            });

            // Si el producto a eliminar tenía stock físico en vitrina, lo regresamos al lote origen
            if (product.currentStock > 0) {
                const totalGramsToReturn = product.currentStock * product.equivalentDryGrams;

                // Intentar recuperar el saldo al lote más reciente vinculado
                const lotToRefund = deletedProduct.lots.length > 0
                    ? deletedProduct.lots[deletedProduct.lots.length - 1].id
                    : null;

                if (lotToRefund) {
                    // Nota: enviamos gramos negativos para que la resta matemática (-) se vuelva una suma
                    await this.lotsService.updateLotBalance(lotToRefund, -totalGramsToReturn, tx);
                }
            }

            return deletedProduct;
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
