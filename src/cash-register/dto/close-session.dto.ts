import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CloseSessionDto {
    @ApiProperty({ example: 82450, description: 'Monto final de cierre de caja (arqueo)' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    closingBalance: number;
}
