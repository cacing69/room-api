import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}
  getResponse(): object {
    return {
      message: 'welcome to Room API',
      data: {
        app: 'api',
        ver: '1.0.0',
        env: {
          node_env: this.configService.get('NODE_ENV') || 'empty',
        },
        contributors: ['@cacing69'],
      },
      extra: null,
      code: '20000',
      meta: {
        requestId: uuid(),
      },
    };
  }
}
