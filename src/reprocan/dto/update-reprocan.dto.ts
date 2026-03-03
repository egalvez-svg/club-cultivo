import { PartialType } from '@nestjs/swagger';
import { CreateReprocanDto } from './create-reprocan.dto';

export class UpdateReprocanDto extends PartialType(CreateReprocanDto) { }
