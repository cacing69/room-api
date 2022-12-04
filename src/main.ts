import { PostStatusInterceptor } from './core/interceptors/post-status.interceptor';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ErrorFilter } from './core/filters/error.filter';
import { CustomValidationPipe } from './core/pipes/custom-validation.pipe';
import cookieParser = require('cookie-parser');
import { useContainer } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { config } from 'aws-sdk';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const configService = app.get(ConfigService);

  config.update({
    accessKeyId: configService.get('AWS_S3_ACCESS_KEY_ID'),
    secretAccessKey: configService.get('AWS_S3_SECRET_ACCESS_KEY'),
    region: configService.get('AWS_S3_REGION'),
  });

  app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      enableDebugMessages: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: false,
      validationError: { target: true },
      skipMissingProperties: true,
      skipNullProperties: true,
      skipUndefinedProperties: true,
      stopAtFirstError: true,
    }),
  );

  app.useGlobalInterceptors(new PostStatusInterceptor());
  // app.useGlobalInterceptors(new ExcludeNullInterceptor());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(cookieParser());

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ErrorFilter(httpAdapter));

  app.enableCors();
  await app.listen(3000);
}
bootstrap();
