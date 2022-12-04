import { InstagramMedia } from './entities/instagram.media.entity';
import { BadRequestException } from './../core/exceptions/bad-request.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateInstagramDto } from './dto/create-instagram.dto';
import { Instagram } from './entities/instagram.entity';
import { ConfigService } from '@nestjs/config';
import { readFileSync, writeFileSync } from 'fs';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import fetch from 'node-fetch';

@Injectable()
export class InstagramService {
  private engine;
  private playwright: any;
  private browser: any;
  private context;
  private page;
  private content;
  private isModeAwsLambda: boolean;
  private instagramCookies;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Instagram)
    private readonly instagramRepository: Repository<Instagram>,
    @InjectRepository(InstagramMedia)
    private readonly instagramMediaRepository: Repository<InstagramMedia>, // private readonly authUserProvider: AuthUserProvider,
  ) {
    this.isModeAwsLambda = this.configService.get('APP_AWS_LAMBDA_FUNCTION');
  }

  async create(createInstagramDto: CreateInstagramDto, actor?: User) {
    try {
      const s3 = new S3();
      // scrape content
      const scraped = await this.scrapeWithPlaywright(
        createInstagramDto.url,
        actor,
      );

      const content = scraped?.items[0];
      const caption = content?.caption?.text;

      const mediaImages = [];

      await content?.carousel_media?.forEach(
        (carousel: any, keyCarousel: number) => {
          carousel.image_versions2.candidates.forEach((media: any) => {
            if (media.width === 1080) {
              if (mediaImages.length <= keyCarousel) {
                mediaImages.push(media.url);
              }
            }
          });
        },
      );

      // upload cover first
      const coverUrlArray =
        content?.carousel_media[0]?.image_versions2?.candidates;
      let coverUrlInstagram = null;

      await coverUrlArray.forEach((v) => {
        console.log(v);
        if (v.width === 150) {
          coverUrlInstagram = v.url;
        }
      });

      console.log('coverUrlInstagram', coverUrlInstagram, mediaImages);

      const coverResult = await fetch(coverUrlInstagram);
      const coverBlob = await coverResult.buffer();

      const coverUploadResult = await s3
        .upload({
          Bucket: this.configService.get('AWS_S3_PUBLIC_BUCKET_NAME'),
          Body: coverBlob,
          Key: `${uuid()}.jpg`,
        })
        .promise();

      let size = null;
      let category = null;
      // const brand = '';
      // const design = '';

      const sizeScrape = caption.match(/(?<=SIZE\s?:+).*?(?=IDR\s:)/gs);

      const categoryScrape = caption.match(
        /(?<=CATEGORY\s:).*?(?=(PANJANG\s:|SIZE\s:))/gs,
      );

      if (categoryScrape?.length > 0) {
        category = categoryScrape[0]?.toLowerCase()?.trim()?.replace('\n', '');
      }

      if (sizeScrape?.length > 0) {
        size = sizeScrape[0]?.toLowerCase()?.trim()?.replace('\n', '');
      }

      const instagram = new Instagram();

      instagram.url = createInstagramDto.url;
      instagram.caption = caption;
      instagram.category = category;
      instagram.coverUrl = coverUploadResult.Location;
      instagram.coverKey = coverUploadResult.Key;
      instagram.size = size;
      instagram.isDone = true;
      instagram.isSold = false;
      instagram.price = 0;
      instagram.createdBy = actor?.id;

      await this.instagramRepository.save(instagram);

      mediaImages.forEach(async (imageUrl: string) => {
        const mediaResult = await fetch(imageUrl);
        const mediaBlob = await mediaResult.buffer();

        const mediaUploadResult = await s3
          .upload({
            Bucket: this.configService.get('AWS_S3_PUBLIC_BUCKET_NAME'),
            Body: mediaBlob,
            Key: `${uuid()}.jpg`,
          })
          .promise();

        // save to instagram media
        const paramsCreateMedia = {
          instagramId: instagram.id,
          url: mediaUploadResult.Location,
          key: mediaUploadResult.Key,
        };

        await this.instagramMediaRepository.save(paramsCreateMedia);
      });
      return {
        scraped: true,
        url: createInstagramDto.url,
        id: instagram.id,
      };
    } catch (error: any) {
      throw new BadRequestException(error?.response?.message || error);
    }
  }

  async scrapeWithPlaywright(url: string, actor?: User) {
    if (url.match(/(https?:\/\/(?:www\.)?instagram\.com\/p\/([^/?#&]+)).*/)) {
      if (this.isModeAwsLambda) {
        this.engine = 'playwright-aws-lambda';
        this.playwright = require('playwright-aws-lambda');
        this.browser = await this.playwright.launchChromium();
      } else {
        this.engine = 'playwright';
        this.playwright = require('playwright');
        this.browser = await this.playwright?.chromium.launch({
          headless: true,
          defaultViewport: null,
          args: [
            '--start-maximized',
            '--disable-web-security',
            '--disable-setuid-sandbox',
          ],
          ignoreHTTPSErrors: true,
        });
      }
      this.context = await this.browser.newContext({
        bypassCSP: true,
      });

      this.page = await this.context.newPage();

      await this.page.route('**/*', (route: any) => {
        if (
          route
            .request()
            .resourceType()
            .match(/^(image|other)/)
        ) {
          return route.abort();
        } else {
          return route.continue();
        }
      });

      const loginAndSetCookie = async () => {
        const execLogin = async () => {
          writeFileSync('./instagram.cookies.json', JSON.stringify([]));

          await this.page.setDefaultNavigationTimeout(100000);
          await this.page.goto('https://instagram.com', {
            waitUntil: 'networkidle',
          });
          await this.page.$eval(
            'input[name=username]',
            (el) => (el.value = ''),
          );
          await this.page.type('input[name=username]', 'cacing.worm', {
            delay: 75,
          });
          await this.page.type('input[name=password]', '23Cacing09#@', {
            delay: 75,
          });
          await this.page.click('button[type="submit"]');
          await this.page.waitForNavigation({ waitUntil: 'networkidle' });
          await this.page.waitForTimeout(3000);

          const currentInstagramCookies = await this.context.cookies();

          await writeFileSync(
            './instagram.cookies.json',
            JSON.stringify(currentInstagramCookies),
          );
        };

        await execLogin();
      };

      this.instagramCookies = JSON.parse(
        await readFileSync('instagram.cookies.json', 'utf8'),
      );

      if (!Object.keys(this.instagramCookies).length) {
        await loginAndSetCookie();
      } else {
        try {
          await this.context.addCookies(this.instagramCookies);
        } catch (error) {
          await loginAndSetCookie();
        }
      }

      try {
        await this.page.goto(`${url}?__a=1&__d=dis`);
        await this.page.waitForLoadState('networkidle');
        this.content = await this.page.$eval('body', (e: any) =>
          e.innerText?.trim(),
        );
      } catch (e) {
      } finally {
        await this.context?.close();
        await this.browser?.close();
      }

      return JSON.parse(this.content);
    } else {
      throw new BadRequestException('invalid instagram url');
    }
  }
}
