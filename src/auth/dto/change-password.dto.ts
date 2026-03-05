import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({ example: 'CurrentPass123!', description: 'Contraseña actual' })
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ example: 'NewPass123!', description: 'Nueva contraseña' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}
