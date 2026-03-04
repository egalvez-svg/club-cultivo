import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({ example: 'VENDEDOR', description: 'Nombre del rol' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'uuid', description: 'ID de la organización (opcional para SuperAdmin)', required: false })
    @IsString()
    @IsOptional()
    organizationId?: string;
}
