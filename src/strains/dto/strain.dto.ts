import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateStrainDto {
    @ApiProperty({ example: 'Gorilla Glue', description: 'Nombre de la variedad/cepa' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Indica', description: 'Tipo de genética (Indica, Sativa, Hybrid)', required: false })
    @IsString()
    @IsOptional()
    genetics?: string;

    @ApiProperty({ example: 20.5, description: 'Porcentaje de THC', required: false })
    @IsNumber()
    @IsOptional()
    thcPercentage?: number;

    @ApiProperty({ example: 1.2, description: 'Porcentaje de CBD', required: false })
    @IsNumber()
    @IsOptional()
    cbdPercentage?: number;

    @ApiProperty({ example: 'Efecto relajante potente', description: 'Descripción técnica', required: false })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateStrainDto extends PartialType(CreateStrainDto) { }
