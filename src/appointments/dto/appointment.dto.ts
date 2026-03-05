import { IsString, IsDateString, IsOptional, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, AppointmentReason } from '../../common/enums/appointment.enum';

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

    @ApiProperty({ description: 'Motivo del turno', enum: AppointmentReason })
    @IsEnum(AppointmentReason)
    reason: AppointmentReason;

    @ApiPropertyOptional({ description: 'Es un paciente externo?' })
    @IsOptional()
    isExternal?: boolean;
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

    @ApiPropertyOptional({ description: 'Motivo del turno', enum: AppointmentReason })
    @IsEnum(AppointmentReason)
    @IsOptional()
    reason?: AppointmentReason;

    @ApiPropertyOptional({ description: 'Estado del turno', enum: AppointmentStatus })
    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus;
}
