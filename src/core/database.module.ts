import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [join(__dirname, '/../**/**.entity{.ts,.js}')],
        autoLoadEntities: true,
        logging: true,
        ssl: Boolean(JSON.parse(configService.get('DATABASE_SSL'))),
        migrationsRun: false,
        // synchronize: Boolean(
        //   JSON.parse(configService.get('DATABASE_SYNCHRONIZE')) || false,
        // ),
        // dropSchema: true,
        dropSchema: false,
        synchronize: false,
        // extra: {
        //   ssl: {
        //     rejectUnauthorized: false,
        //   },
        // },
      }),
    }),
  ],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
