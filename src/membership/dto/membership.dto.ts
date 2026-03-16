import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SignatureType } from '../../common/enums';

export class ApproveMembershipDto {
    @ApiProperty({ example: 'Acta 123, Tomo 1', description: 'Referencia al libro de actas', required: false })
    @IsString()
    @IsOptional()
    minutesBookEntry?: string;

    @ApiProperty({ example: 'S-001', description: 'Número de socio asignado', required: false })
    @IsString()
    @IsOptional()
    memberNumber?: string;

    @ApiProperty({ example: '725901', description: 'Número de REPROCANN si se carga en este paso', required: false })
    @IsString()
    @IsOptional()
    reprocanNumber?: string;

    @ApiProperty({ example: '2025-12-31', description: 'Fecha de vencimiento REPROCANN', required: false })
    @IsString()
    @IsOptional()
    reprocanExpiration?: string;
}

export class SignMembershipDto {
    @ApiProperty({ enum: SignatureType, description: 'Tipo de documento a firmar' })
    @IsEnum(SignatureType)
    @IsNotEmpty()
    type: SignatureType;
}
