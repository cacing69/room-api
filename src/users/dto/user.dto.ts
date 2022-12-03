import { IsIdentical } from '../../../src/core/decorators/is-identical.decorator';
import { Trim } from 'class-sanitizer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UserDto {
  @IsString()
  @IsDefined()
  @IsNotEmpty()
  @Trim()
  firstname: string;

  @IsString()
  @IsDefined()
  @IsOptional()
  @Trim()
  lastname: string;

  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  @Trim()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @MinLength(6)
  @IsIdentical('password')
  passwordConfirmation: string;
}
