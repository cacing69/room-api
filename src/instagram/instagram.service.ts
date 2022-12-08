import { RecordNotFoundException } from './../core/exceptions/not-found.exception';
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
import playwright from 'playwright';

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

  async getById(id: string) {
    const data = await this.instagramRepository.findOne({
      where: { id },
      relations: {
        medias: true,
      },
      order: {
        medias: {
          indexNumber: 'ASC',
        },
      },
    });

    if (data) {
      return data;
    }
    throw new RecordNotFoundException('instagram with this id does not exist');
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

            await content?.carousel_media?.forEach((carousel: any) => {
              mediaImages.push(carousel.image_versions2.candidates[0].url);
            });

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

            let dimension = null;

            const cleanMatchResult = (matchResult: string[]) => {
              return matchResult[0]?.toLowerCase()?.trim()?.replace('\n', '');
            };

            const sizeScrape = caption.match(/(?<=SIZE\s?:+).*?(?=IDR\s:)/gs);

            const categoryScrape = caption.match(
              /(?<=CATEGORY\s:).*?(?=(PANJANG\s:|SIZE\s:))/gs,
            );

            if (cleanMatchResult(categoryScrape) !== 'headgear') {
              const heightScrape = caption.match(
                /(?<=CATEGORY\s:).*?(?=(PANJANG\s:|LEBAR\s:))/gs,
              );
              const widthScrape = caption.match(
                /(?<=CATEGORY\s:).*?(?=(LEBAR\s:|SIZE\s:))/gs,
              );
              dimension = `${cleanMatchResult(heightScrape)}x${cleanMatchResult(
                widthScrape,
              )}`;
            }

            const instagram = new Instagram();

            instagram.url = createInstagramDto.urls[index];
            instagram.caption = caption;
            instagram.category = cleanMatchResult(categoryScrape);
            instagram.coverUrl = coverUploadResult.Location;
            instagram.coverKey = coverUploadResult.Key;
            instagram.size = cleanMatchResult(sizeScrape);
            instagram.isDone = true;
            instagram.isSold = false;
            instagram.price = 0;
            instagram.dimension = dimension;
            instagram.createdBy = actor?.id;

            await this.instagramRepository.save(instagram);

            mediaImages.forEach(
              async (mediaUrl: string, mediaIndex: number) => {
                const mediaResult = await fetch(mediaUrl);
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
                  indexNumber: mediaIndex + 1,
                };

                await this.instagramMediaRepository.save(paramsCreateMedia);
              },
            );
          }
        });
      });

      return {
        scraped: true,
        url: createInstagramDto.urls,
      };
    } catch (error: any) {
      throw new BadRequestException(error?.response?.message || error);
    }
  }

  async scrapeWithPlaywright(urls: string[], actor?: User) {
    const urlIsValid = (eUrls: string[]) => {
      return eUrls.some((eUrl) =>
        eUrl.match(/(https?:\/\/(?:www\.)?instagram\.com\/p\/([^/?#&]+)).*/),
      );
    };

    if (urlIsValid(urls)) {
      // if (this.isModeAwsLambda) {
      //   this.playwright = require('playwright-aws-lambda');
      //   this.browser = await this.playwright.launchChromium({ headless: true });
      //   // this.browser = await this.playwright.connect({
      //   //   browserWSEndpoint:
      //   //     'wss://chrome.browserless.io?token=f7cd02c8-b191-4d8c-9c08-54106d7e739d',
      //   // });
      // } else {
      //   this.playwright = require('playwright');
      //   this.browser = await this.playwright?.chromium.launch({
      //     headless: false,
      //     defaultViewport: null,
      //     args: [
      //       '--start-maximized',
      //       '--disable-web-security',
      //       '--disable-setuid-sandbox',
      //     ],
      //     ignoreHTTPSErrors: true,
      //   });
      // }

      // const chromium = require('chrome-aws-lambda');

      this.browser = await playwright.chromium.launch({
        headless: false,
      });

      this.context = await this.browser.newContext({
        bypassCSP: true,
      });
      // this.context = await this.browser.defaultBrowserContext();
      // this.context.overridePermissions('https://instagram.com', []);
      this.page = await this.context.newPage();

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
        this.context.addCookies(this.instagramCookies);

        const tabScrape = pages.map(async (pageTab, index) => {
          return new Promise((resolve, reject) => {
            (async () => {
              try {
                await pageTab.goto(`${urls[index]}?__a=1&__d=dis`, {
                  waitUntil: 'networkidle',
                });

                const content = await pageTab.$eval('body', (dom: any) =>
                  dom.innerText?.trim(),
                );

                resolve(JSON.parse(content));
              } catch (err) {
                reject(err);
              }
            })();
          }).then(async (json) => {
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
        await this.context?.close();
        await this.browser?.close();

        this.playwright = null;
        this.browser = null;
        this.context = null;
        this.page = null;
        throw new BadRequestException(e);
      }
    } else {
      throw new BadRequestException('invalid instagram url');
    }
  }
}
