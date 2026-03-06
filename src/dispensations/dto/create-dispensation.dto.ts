import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber, IsUUID, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../common/enums';

export class CreateDispensationItemDto {
    @ApiProperty({ example: 'uuid', description: 'ID de la Cepa o Producto' })
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 'uuid', description: 'ID del Lote de Producción utilizado' })
    @IsUUID()
    @IsNotEmpty()
    productionLotId: string;

    @ApiProperty({ example: 3, description: 'Cantidad física (ej. gramos o frascos)' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    quantityUnits: number;

    @ApiProperty({ example: 3, description: 'Cantidad equivalente en gramos secos para límite' })
    @IsNumber()
    @IsNotEmpty()
    equivalentDryGrams: number;

    @ApiProperty({ example: 1200, description: 'Costo por gramo del ítem (precio unitario)' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    costPerEquivalentGram: number;

    @ApiProperty({ example: 3600, description: 'Monto total por esta línea' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    totalRecoveryAmount: number;
}

export class CreateDispensationDto {
    @ApiProperty({ example: 'uuid', description: 'ID del Paciente receptor' })
    @IsUUID()
    @IsNotEmpty()
    recipientId: string;

    @ApiProperty({ enum: PaymentMethod, example: 'CASH', description: 'Método de pago' })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @ApiProperty({ type: [CreateDispensationItemDto], description: 'Items a dispensar' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDispensationItemDto)
    @IsNotEmpty()
    items: CreateDispensationItemDto[];

    @ApiProperty({ example: 500, description: 'Monto bonificado (descuento)', required: false })
    @IsNumber()
    @Min(0)
    @IsOptional()
    discount?: number;
}
