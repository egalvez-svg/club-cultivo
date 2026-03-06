import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { LotStatus } from '../../common/enums';

export class CreateLotDto {
    @ApiProperty({ example: 'LATE-2026-001', description: 'Código identificador único del lote' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ example: 'uuid-product', description: 'ID del producto final asociado' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 'uuid-strain', description: 'ID de la variedad genética' })
    @IsString()
    @IsNotEmpty()
    strainId: string;

    @ApiProperty({ example: 'CREATED', enum: LotStatus, default: LotStatus.CREATED })
    @IsEnum(LotStatus)
    @IsOptional()
    status?: LotStatus;

    @ApiProperty({ example: 'uuid-parent-lot', description: 'ID del lote padre (si es sub-lote)', required: false })
    @IsString()
    @IsOptional()
    parentLotId?: string;

    @ApiProperty({ example: '2026-03-15', description: 'Fecha de inicio del lote', required: false })
    @IsDateString()
    @IsOptional()
    startDate?: string;
}

export class UpdateLotDto extends PartialType(CreateLotDto) {
    @ApiProperty({ example: 500.5, description: 'Peso final en gramos secos equivalents (solo al finalizar)', required: false })
    @IsNumber()
    @IsOptional()
    totalOutputEquivalentGrams?: number;

    @ApiProperty({ example: 25000.0, description: 'Costo total acumulado de producción', required: false })
    @IsNumber()
    @IsOptional()
    totalProductionCost?: number;
}

export class CreateLotCostDto {
    @ApiProperty({ example: 'Fertilizantes', description: 'Categoría o concepto del costo' })
    @IsString()
    @IsNotEmpty()
    concept: string;

    @ApiProperty({ example: 4500.5, description: 'Monto del costo' })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty({ example: 'Compra de nutrientes para etapa de floración', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}
