import { IsInt, IsString, IsEnum, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentReason } from '../../common/enums';

export class CreateAvailabilityConfigDto {
    @ApiProperty({ enum: AppointmentReason })
    @IsEnum(AppointmentReason)
    reason: AppointmentReason;

    @ApiProperty({ description: 'Día de la semana (0-6)', minimum: 0, maximum: 6 })
    @IsInt()
    @Min(0)
    @Max(6)
    dayOfWeek: number;

    @ApiProperty({ description: 'Hora de inicio (HH:mm)', example: '09:00' })
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    startTime: string;

    @ApiProperty({ description: 'Hora de fin (HH:mm)', example: '18:00' })
    @IsString()
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    endTime: string;

    @ApiProperty({ description: 'Duración del turno en minutos', default: 30 })
    @IsInt()
    @Min(5)
    slotDuration: number = 30;
}
