import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
    private readonly primaryColor = '#1b5e20'; // Forest Green
    private readonly secondaryColor = '#455a64'; // Blue Gray
    private readonly borderColor = '#e0e0e0';

    async generatePdfBuffer(
        buildContent: (doc: PDFKit.PDFDocument) => void,
        options: { title: string; organizationName: string }
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
                const buffers: Buffer[] = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // Inicializar fuente por defecto para evitar problemas de métricas
                doc.font('Helvetica');

                // Global Header
                this.drawHeader(doc, options.title, options.organizationName);

                // Main Content
                buildContent(doc);

                // Global Footer (Page Numbers)
                this.addFooter(doc);

                doc.end();
            } catch (error) {
                console.error('PdfService Error:', error);
                reject(error);
            }
        });
    }

    private checkY(doc: PDFKit.PDFDocument, context: string) {
        if (isNaN(doc.y)) {
            console.warn(`[PdfService] NaN detected in doc.y at ${context}. Resetting to 50.`);
            doc.y = 50;
        }
    }

    private drawHeader(doc: PDFKit.PDFDocument, title: string, orgName: string) {
        this.checkY(doc, 'drawHeader start');
        doc.fillColor(this.primaryColor)
            .fontSize(20)
            .text(orgName.toUpperCase(), { align: 'left' });

        doc.fillColor(this.secondaryColor)
            .fontSize(10)
            .text(title, { align: 'right' });

        doc.moveDown(0.5);
        this.checkY(doc, 'drawHeader before line');

        doc.strokeColor(this.primaryColor)
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .stroke();

        doc.moveDown(1.5);
        this.checkY(doc, 'drawHeader end');
    }

    private addFooter(doc: PDFKit.PDFDocument) {
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 50;
            if (!isNaN(footerY)) {
                doc.fillColor('#999999')
                    .fontSize(8)
                    .text(
                        `Pagina ${i + 1} de ${range.count} - Generado por Club Cultivo`,
                        50,
                        footerY,
                        { align: 'center' }
                    );
            }
        }
    }

    /**
     * Helper simple para crear tablas
     */
    drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: any[][], columnWidths: number[]) {
        this.checkY(doc, 'drawTable start');
        const startX = doc.x;
        const rowHeight = 20;

        // Header
        const headerY = doc.y;
        doc.fillColor(this.primaryColor)
            .rect(startX, headerY, 495, rowHeight)
            .fill();

        doc.fillColor('#ffffff').fontSize(10);
        let currentX = startX;
        headers.forEach((header, i) => {
            doc.text(header, currentX + 5, headerY + 5, {
                width: columnWidths[i] - 10,
                align: 'left',
                lineBreak: false
            });
            currentX += columnWidths[i];
        });

        doc.y = headerY + rowHeight;

        // Rows
        doc.fillColor('#000000').fontSize(9);
        rows.forEach((row, rowIndex) => {
            const currentY = doc.y;

            // Zebra striping
            if (rowIndex % 2 === 0) {
                doc.fillColor('#f9f9f9')
                    .rect(startX, currentY, 495, rowHeight)
                    .fill();
            }

            doc.fillColor('#333333');
            let innerX = startX;
            row.forEach((cell, i) => {
                doc.text(cell?.toString() || '', innerX + 5, currentY + 5, { width: columnWidths[i] - 10, align: 'left' });
                innerX += columnWidths[i];
            });

            doc.y = currentY + rowHeight;
            this.checkY(doc, `drawTable row ${rowIndex}`);

            // Border bottom
            doc.strokeColor(this.borderColor)
                .lineWidth(0.5)
                .moveTo(startX, doc.y)
                .lineTo(startX + 495, doc.y)
                .stroke();

            // Break page if it's too down and there are more rows to draw
            if (doc.y > doc.page.height - 100 && rowIndex < rows.length - 1) {
                doc.addPage();
                this.drawHeader(doc, 'Continuación...', '');
            }
        });

        doc.moveDown();
        this.checkY(doc, 'drawTable end');
    }
}
