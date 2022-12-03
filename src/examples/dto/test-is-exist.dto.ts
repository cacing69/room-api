import { IsIdentical } from '../../core/decorators/is-identical.decorator';
import { IsUnique } from '../../core/decorators/is-unique.decorator';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { IsExist } from '../../core/decorators/is-exist.decorator';

export class TestIsExistDto {
  @IsNumber()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @IsUnique(User)
  firstname: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @IsIdentical('firstname')
  firstnameConfirm: string;

  @IsNotEmpty()
  @IsDefined()
  @IsEmail()
  @IsExist(User)
  email: string;
}
