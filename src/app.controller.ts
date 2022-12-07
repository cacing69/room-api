import { ResponseType, setResponse } from './core/helpers/response-helper';
import { Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getApp(): object {
    return this.appService.getResponse();
  }

  @Get('ping')
  @Public()
  getPing(): object {
    return setResponse(ResponseType.Basic, { message: 'pong', method: 'get' });
  }

  @Post('ping')
  @Public()
  postPing(): object {
    return setResponse(ResponseType.Basic, { message: 'pong', method: 'post' });
  }

  @Put('ping')
  @Public()
  putPing(): object {
    return setResponse(ResponseType.Basic, { message: 'pong', method: 'put' });
  }

  @Delete('ping')
  @Public()
  deletePing(): object {
    return setResponse(ResponseType.Basic, {
      message: 'pong',
      method: 'delete',
    });
  }
}
