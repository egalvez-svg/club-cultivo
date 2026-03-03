import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { StrainType } from '@prisma/client';

export class CreateStrainDto {
    @ApiProperty({ example: 'Amnesia Haze', description: 'Nombre de la cepa' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'SOUTH ASIAN X JAMAICAN', description: 'Linaje genético', required: false })
    @IsString()
    @IsOptional()
    genetics?: string;

    @ApiProperty({ enum: StrainType, example: 'SATIVA', required: false })
    @IsEnum(StrainType)
    @IsOptional()
    type?: StrainType;

    @ApiProperty({ example: 22.0, description: 'Porcentaje de THC', required: false })
    @IsNumber()
    @IsOptional()
    thcPercentage?: number;

    @ApiProperty({ example: 0.1, description: 'Porcentaje de CBD', required: false })
    @IsNumber()
    @IsOptional()
    cbdPercentage?: number;
}
