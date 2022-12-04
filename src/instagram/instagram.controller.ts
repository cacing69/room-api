import { setResponse, ResponseType } from './../core/helpers/response-helper';
import { CreateInstagramDto } from './dto/create-instagram.dto';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { Auth } from '../core/decorators/auth.decorator';
import { InstagramService } from './instagram.service';
import { Public } from '../core/decorators/public.decorator';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Public()
  async create(@Auth() user, @Body() createInstagramDto: CreateInstagramDto) {
    const data = await this.instagramService.create(createInstagramDto, user);
    return setResponse(ResponseType.Create, data);
  }

  // @Get('scrape')
  // @Public()
  // async scrape(@Auth() user, @Query() query) {
  //   const data = await this.instagramService.scrapeWithPlaywright(
  //     query?.url,
  //     user,
  //   );

  //   return setResponse(ResponseType.Basic, data);
  // }
}
