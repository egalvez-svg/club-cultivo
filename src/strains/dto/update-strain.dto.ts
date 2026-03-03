import { PartialType } from '@nestjs/swagger';
import { CreateStrainDto } from './create-strain.dto';

export class UpdateStrainDto extends PartialType(CreateStrainDto) { }
