import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Mi Club de Cultivo', description: 'Nombre de la organización' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: '21-12345678-9', description: 'CUIT de la organización', required: false })
    @IsString()
    @IsOptional()
    cuit?: string;

    @ApiProperty({ example: 'Av. 18 de Julio 1234, Montevideo', description: 'Domicilio legal de la organización', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: true, description: 'Estado de la organización', required: false })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}

export class UpdateOrganizationDto {
    @ApiProperty({ example: 'Nuevo Nombre', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ example: '21-12345678-9', description: 'CUIT de la organización', required: false })
    @IsString()
    @IsOptional()
    cuit?: string;

    @ApiProperty({ example: 'Av. 18 de Julio 1234, Montevideo', description: 'Domicilio legal de la organización', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
