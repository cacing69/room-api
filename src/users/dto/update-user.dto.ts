import { UserDto } from './user.dto';
import { PickType } from '@nestjs/mapped-types';
import { IsDefined, IsEmail, IsOptional } from 'class-validator';

export class UpdateUserDto extends PickType(UserDto, [
  'firstname',
  'lastname',
] as const) {
  @IsDefined()
  @IsOptional()
  @IsEmail()
  email: string;
}
