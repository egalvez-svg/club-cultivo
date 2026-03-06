import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class CreatePatientDto {
    @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo del paciente' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: '12345678', description: 'Número de documento (DNI, etc.)' })
    @IsString()
    @IsNotEmpty()
    documentNumber: string;

    @ApiProperty({ example: 'paciente@email.com', description: 'Correo electrónico del paciente', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '725901', description: 'Número de trámite REPROCANN', required: false })
    @IsString()
    @IsOptional()
    reprocanNumber?: string;

    @ApiProperty({ example: '2025-12-31', description: 'Fecha de vencimiento REPROCANN', required: false })
    @IsString()
    @IsOptional()
    reprocanExpiration?: string;

    @ApiProperty({ example: 'av siempre viva 7456', description: 'Dirección física', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: '3513868384', description: 'Teléfono de contacto', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: 1.5, description: 'Dosis diaria prescrita en gramos', required: false })
    @IsNumber()
    @IsOptional()
    dailyDose?: number;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) { }
