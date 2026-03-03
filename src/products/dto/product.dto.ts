import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ example: 'Flores Gorila Glue', description: 'Nombre del producto dispensable' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'FLOWER', description: 'Categoría (FLOWER, OIL, CREAM, etc.)' })
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiProperty({ example: 'uuid-strain', description: 'ID de la variedad (Strain) asociada' })
    @IsString()
    @IsNotEmpty()
    strainId: string;

    @ApiProperty({ example: 'Inflorescencias secas', description: 'Descripción del producto', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: true, description: 'Disponibilidad para dispensa', default: true })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) { }
