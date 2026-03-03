import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReprocanDto } from './dto/create-reprocan.dto';
import { UpdateReprocanDto } from './dto/update-reprocan.dto';

@Injectable()
export class ReprocanService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, patientId: string, createDto: CreateReprocanDto) {
        // Verificar si el paciente pertenece a la organizacion
        const patient = await this.prisma.user.findFirst({
            where: { id: patientId, organizationId }
        });

        if (!patient) {
            throw new NotFoundException('Paciente no encontrado');
        }

        // Si se crea uno nuevo y se pone ACTIVE, hay que pasar los otros a EXPIRED
        if (createDto.status === 'ACTIVE') {
            await this.prisma.reprocanRecord.updateMany({
                where: { patientId, status: 'ACTIVE' },
                data: { status: 'EXPIRED' }
            });
        }

        const expirationDate = createDto.expirationDate ? new Date(createDto.expirationDate) : null;

        return this.prisma.reprocanRecord.create({
            data: {
                patientId,
                reprocanNumber: createDto.reprocanNumber,
                expirationDate,
                status: createDto.status || 'PENDING_RENEWAL',
            },
        });
    }

    async findAllByPatient(organizationId: string, patientId: string) {
        const patient = await this.prisma.user.findFirst({
            where: { id: patientId, organizationId }
        });

        if (!patient) {
            throw new NotFoundException('Paciente no encontrado');
        }

        return this.prisma.reprocanRecord.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(organizationId: string, patientId: string, id: string, updateDto: UpdateReprocanDto) {
        const record = await this.prisma.reprocanRecord.findFirst({
            where: { id, patientId, patient: { organizationId } }
        });

        if (!record) {
            throw new NotFoundException('Registro REPROCANN no encontrado');
        }

        if (updateDto.status === 'ACTIVE') {
            await this.prisma.reprocanRecord.updateMany({
                where: { patientId, id: { not: id }, status: 'ACTIVE' },
                data: { status: 'EXPIRED' }
            });
        }

        const dataToUpdate: any = {};
        if (updateDto.reprocanNumber) dataToUpdate.reprocanNumber = updateDto.reprocanNumber;
        if (updateDto.expirationDate) dataToUpdate.expirationDate = new Date(updateDto.expirationDate);
        if (updateDto.status) dataToUpdate.status = updateDto.status;

        return this.prisma.reprocanRecord.update({
            where: { id },
            data: dataToUpdate,
        });
    }

    async createRecord(data: any, tx?: any) {
        const prisma = tx || this.prisma;
        return prisma.reprocanRecord.create({
            data
        });
    }

    async upsertActiveRecord(patientId: string, data: any, tx?: any) {
        const prisma = tx || this.prisma;
        const activeRecord = await prisma.reprocanRecord.findFirst({
            where: { patientId, status: 'ACTIVE' }
        });

        if (activeRecord) {
            return prisma.reprocanRecord.update({
                where: { id: activeRecord.id },
                data: {
                    reprocanNumber: data.reprocanNumber,
                    expirationDate: data.expirationDate ? new Date(data.expirationDate) : activeRecord.expirationDate,
                    status: data.status || activeRecord.status
                }
            });
        }

        return prisma.reprocanRecord.create({
            data: {
                patientId,
                reprocanNumber: data.reprocanNumber,
                expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
                status: 'ACTIVE'
            }
        });
    }
}
