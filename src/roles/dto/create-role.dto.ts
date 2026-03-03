import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({ example: 'VENDEDOR', description: 'Nombre del rol' })
    @IsString()
    @IsNotEmpty()
    name: string;
}
