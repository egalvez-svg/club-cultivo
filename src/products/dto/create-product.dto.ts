import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { ProductPresentationType, PhysicalUnitType } from '../../common/enums';

export class CreateProductDto {
    @ApiProperty({ example: 'uuid', description: 'ID de la Cepa (Genética)' })
    @IsUUID()
    @IsNotEmpty()
    strainId: string;

    @ApiProperty({ example: 'Flor Seca Amnesia Haze 5g', description: 'Nombre descriptivo del producto' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ enum: ProductPresentationType, example: 'FLOWER', description: 'Tipo de presentación' })
    @IsEnum(ProductPresentationType)
    @IsNotEmpty()
    presentationType: ProductPresentationType;

    @ApiProperty({ enum: PhysicalUnitType, example: 'GRAMS', description: 'Unidad de medida física' })
    @IsEnum(PhysicalUnitType)
    @IsNotEmpty()
    physicalUnitType: PhysicalUnitType;

    @ApiProperty({ example: 5, description: 'Cantidad bruta de la presentación' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    netPhysicalQuantity: number;

    @ApiProperty({ example: 5, description: 'Equivalencia en gramos secos para límite legal' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    equivalentDryGrams: number;

    @ApiProperty({ example: 6000, description: 'Precio o aporte de recuperación total por esta presentación' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    price: number;

    @ApiProperty({ example: 25, description: 'Stock físico actual', required: false })
    @IsNumber()
    @Min(0)
    @IsOptional()
    currentStock?: number;

    @ApiProperty({ example: 'uuid', description: 'ID del Lote de Producción de origen (opcional)', required: false })
    @IsUUID()
    @IsOptional()
    productionLotId?: string;
}
