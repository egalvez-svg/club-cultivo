import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDispensationItemDto {
    @ApiProperty({ example: 'uuid-product', description: 'ID del producto a dispensar' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 'uuid-lot', description: 'ID del lote de origen' })
    @IsString()
    @IsNotEmpty()
    productionLotId: string;

    @ApiProperty({ example: 1, description: 'Cantidad de unidades físicas (frascos, gotas, etc.)' })
    @IsNumber()
    @Min(0.01)
    quantityUnits: number;

    @ApiProperty({ example: 2.5, description: 'Gramos secos equivalentes del ítem' })
    @IsNumber()
    @Min(0.01)
    equivalentDryGrams: number;

    @ApiProperty({ example: 1250.0, description: 'Costo de recuperación por gramo seco' })
    @IsNumber()
    @Min(0)
    costPerEquivalentGram: number;

    @ApiProperty({ example: 3125.0, description: 'Monto total de recuperación para este ítem' })
    @IsNumber()
    @Min(0)
    totalRecoveryAmount: number;
}

export class CreateDispensationDto {
    @ApiProperty({ example: 'uuid-patient', description: 'ID del paciente receptor' })
    @IsString()
    @IsNotEmpty()
    patientId: string;

    @ApiProperty({ example: 5.0, description: 'Total de gramos secos equivalentes (Máx 40g)' })
    @IsNumber()
    @Min(0.01)
    @Max(40)
    totalEquivalentGrams: number;

    @ApiProperty({ example: 6250.0, description: 'Monto total de recuperación de la dispensa' })
    @IsNumber()
    @Min(0)
    totalRecoveryAmount: number;

    @ApiProperty({ type: [CreateDispensationItemDto], description: 'Listado de productos incluidos' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDispensationItemDto)
    items: CreateDispensationItemDto[];
}
