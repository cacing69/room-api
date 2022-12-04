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
import { paginateBuilder } from '../core/helpers/query-helper';
import { PaginateDto } from '../core/dtos/paginate.dto';
// import { setTimeout } from 'timers/promises';

@Injectable()
export class InstagramService {
  private isModeAwsLambda: boolean;
  private instagramCookies;
  private playwright: any;
  private browser: any;
  private context;
  private page;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Instagram)
    private readonly instagramRepository: Repository<Instagram>,
    @InjectRepository(InstagramMedia)
    private readonly instagramMediaRepository: Repository<InstagramMedia>, // private readonly authUserProvider: AuthUserProvider,
  ) {
    this.isModeAwsLambda = this.configService.get('APP_AWS_LAMBDA_FUNCTION');
  }

  async paginate(paginateDto: PaginateDto) {
    // create paginate builder
    const params = paginateBuilder(paginateDto);
    const data = await this.instagramRepository.find(params);
    return data;
  }

  async create(createInstagramDto: CreateInstagramDto, actor?: User) {
    try {
      const s3 = new S3();

      // scrape content
      const scraped = await this.scrapeWithPlaywright(
        createInstagramDto.urls,
        actor,
      );

      scraped.forEach((scrape: any, index: number) => {
        scrape.then(async (rawContent) => {
          const checkInstagramByUrl = await this.instagramRepository.findOneBy({
            url: createInstagramDto.urls[index],
          });

          if (!checkInstagramByUrl) {
            const content = rawContent.items[0];
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
              category = categoryScrape[0]
                ?.toLowerCase()
                ?.trim()
                ?.replace('\n', '');
            }

            if (sizeScrape?.length > 0) {
              size = sizeScrape[0]?.toLowerCase()?.trim()?.replace('\n', '');
            }

            const instagram = new Instagram();

            instagram.url = createInstagramDto.urls[index];
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
          }
        });
      });
    } catch (error: any) {
      throw new BadRequestException(error?.response?.message || error);
    } finally {
      return {
        scraped: true,
        url: createInstagramDto.urls,
      };
    }
  }

  async scrapeWithPlaywright(urls: string[], actor?: User) {
    // if (url.match(/(https?:\/\/(?:www\.)?instagram\.com\/p\/([^/?#&]+)).*/)) {
    if (true) {
      if (this.isModeAwsLambda) {
        this.playwright = require('playwright-aws-lambda');
        this.browser = await this.playwright.launchChromium();
      } else {
        this.playwright = require('playwright');
        this.browser = await this.playwright?.chromium.launch({
          headless: false,
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

      const loginAndSetCookie = async () => {
        const execLogin = async () => {
          const page = await this.context.newPage();

          writeFileSync('./instagram.cookies.json', JSON.stringify([]));

          await page.setDefaultNavigationTimeout(100000);
          await page.goto('https://instagram.com', {
            waitUntil: 'networkidle',
          });
          await page.$eval('input[name=username]', (el) => (el.value = ''));
          await page.type('input[name=username]', 'cacing.worm', {
            delay: 75,
          });
          await page.type('input[name=password]', '23Cacing09#@', {
            delay: 75,
          });
          await page.click('button[type="submit"]');
          await page.waitForNavigation({ waitUntil: 'networkidle' });
          await page.waitForTimeout(3000);

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
        const pages = await Promise.all(
          Array(urls.length)
            .fill(null)
            .map(async () => {
              const page = await this.context.newPage();
              return page;
            }),
        );

        let loaded = 0;

        const tabScrape = pages.map(async (pageTab, index) => {
          return new Promise((resolve, reject) => {
            (async () => {
              try {
                await pageTab.goto(`${urls[index]}?__a=1&__d=dis`);
                await pageTab.waitForLoadState('networkidle');

                const content = await pageTab.$eval('body', (dom: any) =>
                  dom.innerText?.trim(),
                );
                resolve(JSON.parse(content));
              } catch (err) {
                reject(err);
              }
            })();
          }).then(async (json) => {
            // console.log(instagramContent);
            // process here
            loaded += 1;
            if (loaded == urls.length) {
              await this.context?.close();
              await this.browser?.close();

              this.playwright = null;
              this.browser = null;
              this.context = null;
              this.page = null;
            }

            return new Promise((resolve, reject) => {
              resolve(json);
            });
          });
        });
        return tabScrape;
      } catch (e) {
        console.log(e);
      }
    } else {
      throw new BadRequestException('invalid instagram url');
    }
  }
}
