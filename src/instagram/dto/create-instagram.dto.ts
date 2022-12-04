import { InstagramDto } from './instagram.dto';
import { PartialType } from '@nestjs/mapped-types';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateInstagramDto {
  @IsArray()
  // "each" tells class-validator to run the validation on each item of the array
  @IsString({ each: true })
  @ArrayMinSize(1)
  urls: string[];
}
