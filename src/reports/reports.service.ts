import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { PdfService } from '../pdf/pdf.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
    constructor(
        private prisma: PrismaService,
        private pdfService: PdfService
    ) { }

    async getPatientTraceability(organizationId: string, month: number, year: number, format: 'json' | 'pdf' = 'json', userId: string) {
        const numYear = Number(year);
        const numMonth = Number(month);
        const startDate = new Date(numYear, numMonth - 1, 1);
        const endDate = new Date(numYear, numMonth, 0, 23, 59, 59);

        const dispensations = await this.prisma.dispensation.findMany({
            where: {
                organizationId,
                status: 'CONFIRMED',
                confirmedAt: { gte: startDate, lte: endDate }
            },
            include: {
                recipient: {
                    include: {
                        reprocanRecords: {
                            where: { status: 'ACTIVE' },
                            take: 1
                        }
                    }
                },
                items: {
                    include: {
                        product: { include: { strain: true } },
                        productionLot: true
                    }
                }
            },
            orderBy: { confirmedAt: 'asc' }
        });

        if (format === 'pdf') {
            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                doc.fontSize(20).text(`Trazabilidad de Pacientes - ${month}/${year}`, { align: 'center' });
                doc.moveDown();

                if (dispensations.length === 0) {
                    doc.fontSize(12).text('No hay dispensaciones en este período.');
                    return;
                }

                dispensations.forEach(d => {
                    const recipient = d.recipient;
                    const reprocan = recipient.reprocanRecords[0]?.reprocanNumber || 'Sin REPROCANN';

                    doc.fontSize(14).text(`Paciente: ${recipient.fullName} - DNI: ${recipient.documentNumber}`);
                    doc.fontSize(12).text(`REPROCANN: ${reprocan}`);
                    doc.text(`Fecha Entrega: ${d.confirmedAt ? d.confirmedAt.toLocaleDateString() : 'Desconocida'}`);

                    d.items.forEach(item => {
                        doc.text(`  - Producto: ${item.product.name} (${item.product.strain.name})`);
                        doc.text(`    Lote: ${item.productionLot.lotCode}`);
                        doc.text(`    Cantidad Equivalente: ${item.equivalentDryGrams} gr`);
                    });
                    doc.moveDown();
                });
            });

            // Registrar en base de datos
            await this.prisma.generatedReport.create({
                data: {
                    organizationId,
                    name: `REPROCANN_${month}_${year}.pdf`,
                    type: 'PATIENT_TRACEABILITY',
                    fileSize: buffer.length,
                    generatedById: userId
                }
            });

            return buffer;
        }

        return dispensations.map(d => ({
            id: d.id,
            patient: d.recipient.fullName,
            reprocan: d.recipient.reprocanRecords[0]?.reprocanNumber,
            date: d.confirmedAt,
            items: d.items.map(i => ({
                product: i.product.name,
                strain: i.product.strain.name,
                lot: i.productionLot.lotCode,
                grams: i.equivalentDryGrams
            }))
        }));
    }

    async getCultivationReport(organizationId: string, month: number, year: number, format: 'json' | 'pdf' = 'json', userId: string) {
        const numYear = Number(year);
        const numMonth = Number(month);
        const startDate = new Date(numYear, numMonth - 1, 1);
        const endDate = new Date(numYear, numMonth, 0, 23, 59, 59);

        const lots = await this.prisma.productionLot.findMany({
            where: {
                organizationId,
                createdAt: { gte: startDate, lte: endDate }
            },
            include: {
                strain: true,
                products: true,
                costs: true,
                stockMovements: true
            },
            orderBy: { createdAt: 'desc' }
        });

        if (format === 'pdf') {
            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                doc.fontSize(20).text(`Libro de Cultivo (Lotes) - ${month}/${year}`, { align: 'center' });
                doc.moveDown();

                if (lots.length === 0) {
                    doc.fontSize(12).text('No hay lotes registrados en este período.');
                    return;
                }

                lots.forEach(lot => {
                    doc.fontSize(12).text(`  - Variedad: ${lot.strain.name} (${lot.strain.type})`);
                    doc.text(`  - Tipo: ${lot.lotType}`);
                    doc.text(`  - Productos: ${lot.products.length > 0 ? lot.products.map(p => p.name).join(', ') : 'N/A'}`);
                    doc.text(`  - Cosecha (Gramos Eq.): ${lot.totalOutputEquivalentGrams} gr`);
                    doc.text(`  - Costo Total: $${lot.totalProductionCost}`);

                    if (lot.stockMovements.length > 0) {
                        doc.text('  - Movimientos Registrados:');
                        lot.stockMovements.forEach(m => {
                            doc.fontSize(10).text(`      * ${m.movementType}: ${m.quantityEquivalentGrams} gr - Ref: ${m.referenceType || 'N/A'}`);
                        });
                        doc.fontSize(12);
                    }
                    doc.moveDown();
                });
            });

            await this.prisma.generatedReport.create({
                data: {
                    organizationId,
                    name: `Cultivo_${month}_${year}.pdf`,
                    type: 'CULTIVATION_BOOK',
                    fileSize: buffer.length,
                    generatedById: userId
                }
            });

            return buffer;
        }

        return lots.map(lot => ({
            id: lot.id,
            code: lot.lotCode,
            status: lot.status,
            strain: lot.strain.name,
            outputGrams: lot.totalOutputEquivalentGrams,
            cost: lot.totalProductionCost,
            product: lot.products.map(p => p.name).join(', '),
            movementsCount: lot.stockMovements.length
        }));
    }

    async getFinancialAuditReport(organizationId: string, month: number, year: number, format: 'json' | 'pdf' = 'json', userId: string) {
        const numYear = Number(year);
        const numMonth = Number(month);
        const startDate = new Date(numYear, numMonth - 1, 1);
        const endDate = new Date(numYear, numMonth, 0, 23, 59, 59);

        const [payments, expenses, sessions, cashMovements] = await Promise.all([
            this.prisma.payment.findMany({
                where: { organizationId, createdAt: { gte: startDate, lte: endDate }, status: 'PAID' },
                include: { user: true }
            }),
            this.prisma.expense.findMany({
                where: { organizationId, createdAt: { gte: startDate, lte: endDate } }
            }),
            this.prisma.cashRegisterSession.findMany({
                where: { organizationId, openedAt: { gte: startDate, lte: endDate } },
                include: { openedBy: true, closedBy: true }
            }),
            this.prisma.cashMovement.findMany({
                where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
                include: { createdBy: true }
            })
        ]);

        const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0) +
            cashMovements.filter(m => m.movementType === 'INCOME' && !m.referenceId).reduce((sum, m) => sum + m.amount, 0);

        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0) +
            cashMovements.filter(m => m.movementType === 'EXPENSE' && !m.referenceId).reduce((sum, m) => sum + m.amount, 0);

        const netBalance = totalIncome - totalExpense;

        if (format === 'pdf') {
            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                doc.fontSize(20).text(`Auditoría Financiera - ${month}/${year}`, { align: 'center' });
                doc.moveDown();

                // Resumen
                doc.fontSize(16).text('Resumen General');
                doc.fontSize(12).text(`  Total Ingresos: $${totalIncome.toFixed(2)}`);
                doc.text(`  Total Egresos: $${totalExpense.toFixed(2)}`);
                doc.text(`  Balance Neto: $${netBalance.toFixed(2)}`);
                doc.moveDown();

                // Ingresos
                doc.fontSize(14).text('Ingresos Registrados (Pagos y Manuales)');
                payments.forEach(p => {
                    doc.fontSize(10).text(`  - $${p.amount} | Método: ${p.paymentMethod} | Paciente: ${p.user.fullName} | Fecha: ${p.createdAt.toLocaleDateString()}`);
                });
                cashMovements.filter(m => m.movementType === 'INCOME' && !m.referenceId).forEach(m => {
                    doc.fontSize(10).text(`  - $${m.amount} | Ingreso Manual | Nota: ${m.notes || 'S/N'} | Fecha: ${m.createdAt.toLocaleDateString()}`);
                });
                doc.moveDown();

                // Egresos
                doc.fontSize(14).text('Egresos Registrados (Gastos y Retiros)');
                expenses.forEach(e => {
                    doc.fontSize(10).text(`  - $${e.amount} | Gasto: ${e.category} | Desc: ${e.description || 'N/A'} | Fecha: ${e.createdAt.toLocaleDateString()}`);
                });
                cashMovements.filter(m => m.movementType === 'EXPENSE' && !m.referenceId).forEach(m => {
                    doc.fontSize(10).text(`  - $${m.amount} | Retiro Manual | Nota: ${m.notes || 'S/N'} | Fecha: ${m.createdAt.toLocaleDateString()}`);
                });
                doc.moveDown();

                // Sesiones de caja
                doc.fontSize(14).text('Sesiones de Caja');
                sessions.forEach(s => {
                    const status = s.status === 'CLOSED' ? `Cerrada ($${s.closingBalance})` : 'Abierta';
                    doc.fontSize(10).text(`  - Apertura: ${s.openedAt.toLocaleString()} ($${s.openingBalance}) por ${s.openedBy.fullName}`);
                    doc.text(`    Estado: ${status}`);
                });
            });

            await this.prisma.generatedReport.create({
                data: {
                    organizationId,
                    name: `Finanzas_${month}_${year}.pdf`,
                    type: 'FINANCIAL_AUDIT',
                    fileSize: buffer.length,
                    generatedById: userId
                }
            });

            return buffer;
        }

        return {
            summary: { totalIncome, totalExpense, netBalance },
            recentPayments: payments,
            expenses,
            manualMovements: cashMovements.filter(m => !m.referenceId),
            sessions
        };
    }

    async getRecentGeneratedReports(organizationId: string) {
        const reports = await this.prisma.generatedReport.findMany({
            where: { organizationId },
            include: { generatedBy: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return reports.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            fileSize: r.fileSize,
            generatedBy: r.generatedBy.fullName,
            date: r.createdAt
        }));
    }

    async getPatientConsumptions(organizationId: string, month: number, year: number) {
        const numYear = Number(year);
        const numMonth = Number(month);
        const startDate = new Date(numYear, numMonth - 1, 1);
        const endDate = new Date(numYear, numMonth, 0, 23, 59, 59);

        return this.prisma.dispensation.findMany({
            where: {
                recipient: { organizationId },
                createdAt: { gte: startDate, lte: endDate },
                status: 'CONFIRMED',
            },
            include: {
                recipient: true,
                items: { include: { product: true } },
            },
        });
    }

    async getProductionTraceability(organizationId: string) {
        return this.prisma.productionLot.findMany({
            where: { organizationId },
            include: {
                products: true,
                stockMovements: { include: { createdBy: true } },
                costs: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getStockProjection(organizationId: string) {
        // Lógica para proyectar stock basada en dispensaciones vs producción
        const lots = await this.prisma.productionLot.findMany({
            where: { organizationId, status: 'RELEASED' },
            include: { stockMovements: true, products: true },
        });

        return lots.map(lot => {
            const currentStock = lot.stockMovements.reduce((acc, mov) => acc + mov.quantityEquivalentGrams, 0);
            return {
                lotCode: lot.lotCode,
                productName: lot.products.map(p => p.name).join(', '),
                currentStock,
                status: lot.status,
            };
        });
    }
}
