import { IsString, IsDateString, IsOptional, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export class CreateAppointmentDto {
    @ApiPropertyOptional({ description: 'ID del paciente (si ya es paciente registrado)' })
    @IsString()
    @IsOptional()
    patientId?: string;

    @ApiPropertyOptional({ description: 'Nombre del visitante (si no es paciente)' })
    @ValidateIf((o) => !o.patientId)
    @IsString()
    guestName?: string;

    @ApiPropertyOptional({ description: 'Telefono del visitante' })
    @IsString()
    @IsOptional()
    guestPhone?: string;

    @ApiProperty({ description: 'Fecha y hora del turno', example: '2026-03-10T14:00:00.000Z' })
    @IsDateString()
    date: string;

    @ApiProperty({ description: 'Motivo del turno' })
    @IsString()
    reason: string;
}

export class UpdateAppointmentDto {
    @ApiPropertyOptional({ description: 'ID del paciente (para vincular visitante a paciente)' })
    @IsString()
    @IsOptional()
    patientId?: string;

    @ApiPropertyOptional({ description: 'Fecha y hora del turno' })
    @IsDateString()
    @IsOptional()
    date?: string;

    @ApiPropertyOptional({ description: 'Motivo del turno' })
    @IsString()
    @IsOptional()
    reason?: string;

    @ApiPropertyOptional({ description: 'Estado del turno', enum: AppointmentStatus })
    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus;
}
