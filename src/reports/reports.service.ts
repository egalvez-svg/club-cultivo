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
            const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                doc.fontSize(12).fillColor('#333333').text(`Reporte de Entregas por Paciente`, { align: 'center' });
                doc.moveDown();

                const tableHeaders = ['Fecha', 'Paciente', 'DNI', 'Producto', 'Lote', 'Cant. Física', 'Gramos'];
                const tableRows: any[][] = [];

                dispensations.forEach(d => {
                    d.items.forEach(item => {
                        const unitLabel = item.product.physicalUnitType === 'UNIT' ? 'un' : item.product.physicalUnitType.toLowerCase();
                        tableRows.push([
                            d.confirmedAt ? d.confirmedAt.toLocaleDateString() : '-',
                            d.recipient.fullName,
                            d.recipient.documentNumber,
                            item.product.name,
                            item.productionLot.lotCode,
                            `${item.quantityUnits} ${unitLabel}`,
                            `${item.equivalentDryGrams} gr`
                        ]);
                    });
                });

                this.pdfService.drawTable(doc, tableHeaders, tableRows, [70, 90, 65, 80, 65, 65, 60]);
            }, {
                title: `Trazabilidad de Pacientes - ${month}/${year}`,
                organizationName: org?.name || 'Club Cultivo'
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
            const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                doc.fontSize(12).fillColor('#333333').text(`Seguimiento de Lotes y Cosechas`, { align: 'center' });
                doc.moveDown();

                const tableHeaders = ['Lote', 'Variedad', 'Tipo', 'Estado', 'Cosecha', 'Costo'];
                const tableRows = lots.map(lot => [
                    lot.lotCode,
                    lot.strain.name,
                    lot.lotType,
                    lot.status,
                    `${lot.totalOutputEquivalentGrams} gr`,
                    `$${lot.totalProductionCost}`
                ]);

                this.pdfService.drawTable(doc, tableHeaders, tableRows, [90, 100, 80, 75, 80, 70]);
            }, {
                title: `Libro de Cultivo - ${month}/${year}`,
                organizationName: org?.name || 'Club Cultivo'
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
            const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });

            const buffer = await this.pdfService.generatePdfBuffer((doc) => {
                // Resumen
                const summaryY = doc.y;
                doc.fillColor('#f5f5f5').rect(50, summaryY, 495, 60).fill();
                doc.fillColor('#333333').fontSize(14).text('RESUMEN DE PERIODO', 60, summaryY + 10);

                doc.fontSize(10);
                doc.text(`Ingresos Totales: $${(totalIncome || 0).toFixed(2)}`, 60, summaryY + 35);
                doc.text(`Egresos Totales: $${(totalExpense || 0).toFixed(2)}`, 200, summaryY + 35);
                doc.text(`Balance Neto: $${(netBalance || 0).toFixed(2)}`, 340, summaryY + 35);

                doc.y = summaryY + 80; // Bajamos el cursor después del cuadro
                doc.x = 50;            // Reset alignment to left margin
                doc.moveDown();

                // Ingresos
                doc.fontSize(13).fillColor('#1b5e20').text('DETALLE DE INGRESOS');
                doc.moveDown(0.5);
                const incHeaders = ['Fecha', 'Concepto', 'Referencia', 'Monto'];
                const incRows = [
                    ...payments.map(p => [p.createdAt.toLocaleDateString(), 'Pago Dispensación', p.user.fullName, `$${p.amount.toFixed(2)}`]),
                    ...cashMovements.filter(m => m.movementType === 'INCOME' && !m.referenceId).map(m => [m.createdAt.toLocaleDateString(), 'Ingreso Manual', m.notes || 'S/N', `$${m.amount.toFixed(2)}`])
                ];
                this.pdfService.drawTable(doc, incHeaders, incRows, [80, 140, 175, 100]);

                // Egresos
                doc.x = 50; // Ensure margin
                doc.moveDown();
                doc.fontSize(13).fillColor('#c62828').text('DETALLE DE EGRESOS');
                doc.moveDown(0.5);
                const expHeaders = ['Fecha', 'Concepto', 'Descripción', 'Monto'];
                const expRows = [
                    ...expenses.map(e => [e.createdAt.toLocaleDateString(), e.category, e.description || '-', `$${e.amount.toFixed(2)}`]),
                    ...cashMovements.filter(m => m.movementType === 'EXPENSE' && !m.referenceId).map(m => [m.createdAt.toLocaleDateString(), 'Manual / Retiro', m.notes || 'S/N', `$${m.amount.toFixed(2)}`])
                ];
                this.pdfService.drawTable(doc, expHeaders, expRows, [80, 120, 195, 100]);
            }, {
                title: `Auditoría Financiera - ${month}/${year}`,
                organizationName: org?.name || 'Club Cultivo'
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
