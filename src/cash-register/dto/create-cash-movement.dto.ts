import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { CashMovementType } from '../../common/enums';

export class CreateCashMovementDto {
    @ApiProperty({ enum: CashMovementType, example: 'INCOME', description: 'Tipo de movimiento' })
    @IsEnum(CashMovementType)
    @IsNotEmpty()
    movementType: CashMovementType;

    @ApiProperty({ example: 5000, description: 'Monto del movimiento' })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty({ example: 'Pago de luz', description: 'Notas o descripción del movimiento', required: false })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ example: 'EXPENSE', description: 'Referencia del tipo de movimiento (opcional)', required: false })
    @IsString()
    @IsOptional()
    referenceType?: string;

    @ApiProperty({ example: 'uuid', description: 'ID de referencia (opcional)', required: false })
    @IsString()
    @IsOptional()
    referenceId?: string;
}
