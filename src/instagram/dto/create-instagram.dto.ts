import { InstagramDto } from './instagram.dto';
import { PartialType } from '@nestjs/mapped-types';

export class CreateInstagramDto extends PartialType(InstagramDto) {}
