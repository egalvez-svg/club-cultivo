import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrainDto } from './dto/create-strain.dto';
import { UpdateStrainDto } from './dto/update-strain.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StrainsService {
    constructor(private prisma: PrismaService) { }

    async create(organizationId: string, createDto: CreateStrainDto) {
        const data: Prisma.StrainCreateInput = {
            organization: { connect: { id: organizationId } },
            name: createDto.name,
            genetics: createDto.genetics || null,
            type: createDto.type || 'OTHER',
            thcPercentage: createDto.thcPercentage || null,
            cbdPercentage: createDto.cbdPercentage || null,
        };

        return this.prisma.strain.create({ data });
    }

    async findAll(organizationId: string) {
        return this.prisma.strain.findMany({
            where: { organizationId, active: true },
            include: {
                _count: {
                    select: { lots: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(organizationId: string, id: string) {
        const strain = await this.prisma.strain.findFirst({
            where: { id, organizationId, active: true },
            include: {
                _count: {
                    select: { lots: true }
                }
            }
        });

        if (!strain) {
            throw new NotFoundException(`Cepa no encontrada`);
        }

        return strain;
    }

    async update(organizationId: string, id: string, updateDto: UpdateStrainDto) {
        await this.findOne(organizationId, id); // Verify it exists and belongs to org

        return this.prisma.strain.update({
            where: { id },
            data: updateDto,
        });
    }

    async findAllReleased(organizationId: string) {
        return this.prisma.strain.findMany({
            where: {
                organizationId,
                active: true,
                lots: {
                    some: {
                        status: 'RELEASED'
                    }
                }
            },
            include: {
                _count: {
                    select: { lots: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async remove(organizationId: string, id: string) {
        await this.findOne(organizationId, id); // Verify it exists and belongs to org

        return this.prisma.strain.update({
            where: { id },
            data: { active: false },
        });
    }
}
