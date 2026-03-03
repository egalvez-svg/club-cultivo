import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class OpenSessionDto {
    @ApiProperty({ example: 10000, description: 'Monto inicial de apertura de caja' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    openingBalance: number;
}
