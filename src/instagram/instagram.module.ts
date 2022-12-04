import { InstagramMedia } from './entities/instagram.media.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { Instagram } from './entities/instagram.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Instagram, InstagramMedia])],
  controllers: [InstagramController],
  providers: [InstagramService],
})
export class InstagramModule {}
