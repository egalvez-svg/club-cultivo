import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'Juan Perez', description: 'Nombre completo del usuario' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: '12345678', description: 'DNI o Número de documento' })
    @IsString()
    @IsNotEmpty()
    documentNumber: string;

    @ApiProperty({ example: 'operario@clubcultivo.com', description: 'Correo electrónico del nuevo usuario' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Pass123!', description: 'Contraseña temporal' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: ['role-uuid-1', 'role-uuid-2'], description: 'Lista de IDs de los roles asignados', type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    roleIds: string[];

    @ApiProperty({ example: 'org-uuid', description: 'ID de la organización (opcional para admins)', required: false })
    @IsString()
    @IsOptional()
    organizationId?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }
