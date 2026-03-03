import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { LotType, LotStatus } from '@prisma/client';

export class CreateLotDto {
    @ApiProperty({ example: 'uuid', description: 'ID de la Cepa (Strain)' })
    @IsUUID()
    @IsNotEmpty()
    strainId: string;

    @ApiProperty({ enum: LotType, example: 'CULTIVATION', description: 'Tipo de lote' })
    @IsEnum(LotType)
    @IsNotEmpty()
    lotType: LotType;

    @ApiProperty({ example: 'LOT-2024-001', description: 'Código del lote (opcional, se genera auto si no viene)', required: false })
    @IsString()
    @IsOptional()
    lotCode?: string;

    @ApiProperty({ example: 'uuid', description: 'ID del lote padre', required: false })
    @IsUUID()
    @IsOptional()
    parentLotId?: string;

    @ApiProperty({ example: 1200, description: 'Gramos equivalentes producidos', required: false })
    @IsNumber()
    @IsOptional()
    totalOutputEquivalentGrams?: number;

    @ApiProperty({ example: 120000, description: 'Costo total de producción', required: false })
    @IsNumber()
    @IsOptional()
    totalProductionCost?: number;

    @ApiProperty({ enum: LotStatus, example: 'CREATED', required: false })
    @IsEnum(LotStatus)
    @IsOptional()
    status?: LotStatus;
}
