import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
// import { DatabaseService } from 'src/database/database.service';

export function IsNotExist(
  property: object,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsNotExistConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsNotExist', async: true })
@Injectable()
export class IsNotExistConstraint implements ValidatorConstraintInterface {
  constructor(private readonly manager: EntityManager) {}

  async validate(value: any, args: ValidationArguments) {
    if (value) {
      const [params] = args.constraints;

      const result = await this.manager.getRepository(params).findOne({
        where: {
          [args.property]: value,
          deleteAt: null,
        },
      });

      if (result) return false;
      return true;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    console.log(args);
    return args.value
      ? `${args.property}(${args.value || ''}) does exist`
      : `${args.property} failed check is not exist`;
  }
}
