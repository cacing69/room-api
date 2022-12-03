import { Instagram } from './../entities/instagram.entity';
import { Trim } from 'class-sanitizer';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { IsNotExist } from '@/src/core/decorators/is-not-exist.decorator';

export class InstagramDto {
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Trim()
  @IsNotExist(Instagram)
  url: string;
}
