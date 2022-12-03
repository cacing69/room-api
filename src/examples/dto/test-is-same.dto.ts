import {
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { User } from '../../../src/users/entities/user.entity';
import { IsUnique } from '../../core/decorators/is-unique.decorator';
import { IsIdentical } from '../../core/decorators/is-identical.decorator';

export class TestIsSameDto {
  @IsString()
  @IsOptional()
  @IsDefined()
  @IsUnique(User)
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
