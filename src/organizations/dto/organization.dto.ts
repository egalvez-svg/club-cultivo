import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Mi Club de Cultivo', description: 'Nombre de la organización' })
    @IsString()
    @IsNotEmpty()
    name: string;

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

    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
