import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RegisterPaymentDto {
    @ApiProperty({ example: 'CASH', enum: PaymentMethod, description: 'Método de pago utilizado' })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @ApiProperty({ example: 'Pago recibido por mostrador', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
