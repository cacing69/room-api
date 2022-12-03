import { BadRequestException } from './../core/exceptions/bad-request.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateInstagramDto } from './dto/create-instagram.dto';
import { Instagram } from './entities/instagram.entity';

@Injectable()
export class InstagramService {
  constructor(
    @InjectRepository(Instagram)
    private readonly instagramRepository: Repository<Instagram>, // private readonly authUserProvider: AuthUserProvider,
  ) {}

  async create(createInstagramDto: CreateInstagramDto, actor?: User) {
    try {
      const data = await this.instagramRepository.create({
        ...createInstagramDto,
        ...{
          createdBy: actor?.id,
        },
      });

      await this.instagramRepository.save(data);
      return data;
    } catch (error: any) {
      throw new BadRequestException(error);
    }
  }
}
