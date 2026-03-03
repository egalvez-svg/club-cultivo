import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'admin@clubcultivo.com', description: 'Correo electrónico del usuario' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Admin123!', description: 'Contraseña del usuario' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}



export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com', description: 'Correo electrónico para recuperación' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'token-recibido', description: 'Token de recuperación enviado por correo' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'NewPass123!', description: 'Nueva contraseña' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}

export class RefreshTokenDto {
    @ApiProperty({ example: 'refresh-token-string', description: 'Refresh token actual' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;

    @ApiProperty({ example: 'user-uuid', description: 'ID del usuario' })
    @IsString()
    @IsNotEmpty()
    id: string;
}
