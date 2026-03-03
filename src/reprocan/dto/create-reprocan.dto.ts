import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ReprocanStatus } from '@prisma/client';

export class CreateReprocanDto {
    @ApiProperty({ example: '725901', description: 'Número de trámite REPROCANN' })
    @IsString()
    @IsNotEmpty()
    reprocanNumber: string;

    @ApiProperty({ example: '2025-12-31', description: 'Fecha de vencimiento', required: false })
    @IsDateString()
    @IsOptional()
    expirationDate?: string;

    @ApiProperty({ enum: ReprocanStatus, example: 'ACTIVE', required: false })
    @IsEnum(ReprocanStatus)
    @IsOptional()
    status?: ReprocanStatus;
}
