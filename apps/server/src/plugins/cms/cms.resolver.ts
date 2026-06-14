import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Repository } from 'typeorm';
import { HomepageBanner } from './homepage-banner.entity';
import { SiteAnnouncement } from './site-announcement.entity';

type BannerInput = Partial<HomepageBanner>;
type AnnouncementInput = Partial<SiteAnnouncement>;
type BannerImageInput = {
  filename?: string | null;
  mimeType: string;
  dataUrl: string;
};

@Resolver()
export class CmsResolver {
  constructor(
    @InjectRepository(HomepageBanner)
    private readonly bannerRepo: Repository<HomepageBanner>,
    @InjectRepository(SiteAnnouncement)
    private readonly announcementRepo: Repository<SiteAnnouncement>,
  ) {}

  @Query()
  @Allow(Permission.Public)
  async siteAnnouncement() {
    const announcement = await this.getOrCreateAnnouncement();
    return announcement.enabled ? announcement : null;
  }

  @Query()
  @Allow(Permission.Authenticated)
  async adminSiteAnnouncement(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    return this.getOrCreateAnnouncement();
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async updateSiteAnnouncement(@Ctx() ctx: RequestContext, @Args('input') input: AnnouncementInput) {
    this.requireAdmin(ctx);
    const announcement = await this.getOrCreateAnnouncement();
    Object.assign(announcement, this.cleanAnnouncementInput(input));
    return this.announcementRepo.save(announcement);
  }

  @Query()
  @Allow(Permission.Public)
  async homepageBanners() {
    return this.bannerRepo.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  @Query()
  @Allow(Permission.Authenticated)
  async adminHomepageBanners(@Ctx() ctx: RequestContext) {
    this.requireAdmin(ctx);
    return this.bannerRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async createHomepageBanner(@Ctx() ctx: RequestContext, @Args('input') input: BannerInput) {
    this.requireAdmin(ctx);
    const banner = this.bannerRepo.create(this.cleanInput(input));
    return this.bannerRepo.save(banner);
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async updateHomepageBanner(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: BannerInput) {
    this.requireAdmin(ctx);
    const banner = await this.bannerRepo.findOne({ where: { id: String(id) } });
    if (!banner) throw new Error('Баннер олдсонгүй');
    Object.assign(banner, this.cleanInput(input));
    return this.bannerRepo.save(banner);
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async deleteHomepageBanner(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
    this.requireAdmin(ctx);
    const result = await this.bannerRepo.delete(String(id));
    return (result.affected ?? 0) > 0;
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async uploadHomepageBannerImage(@Ctx() ctx: RequestContext, @Args('input') input: BannerImageInput) {
    this.requireAdmin(ctx);
    const extension = this.getImageExtension(input.mimeType);
    const base64 = input.dataUrl.includes(',') ? input.dataUrl.split(',').pop() : input.dataUrl;
    if (!base64) throw new Error('Зургийн дата хоосон байна');

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      throw new Error('Зургийн хэмжээ 4MB-аас их байна');
    }

    const safeName = (input.filename ?? 'banner')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'banner';
    const filename = `${safeName}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'apps/server/static/assets/cms-banners');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return `/assets/cms-banners/${filename}`;
  }

  private cleanInput(input: BannerInput) {
    return {
      title: input.title?.trim() || 'Шинэ баннер',
      subtitle: input.subtitle?.trim() || null,
      eyebrow: input.eyebrow?.trim() || null,
      ctaLabel: input.ctaLabel?.trim() || null,
      ctaHref: input.ctaHref?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      accentColor: input.accentColor?.trim() || '#ff4500',
      sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
      enabled: input.enabled ?? true,
    };
  }

  private async getOrCreateAnnouncement() {
    const existing = await this.announcementRepo.find({ order: { createdAt: 'ASC' }, take: 1 });
    if (existing[0]) return existing[0];
    return this.announcementRepo.save(this.announcementRepo.create(this.cleanAnnouncementInput({})));
  }

  private cleanAnnouncementInput(input: AnnouncementInput) {
    return {
      title: input.title?.trim() || 'Үнэгүй хүргэлт',
      message: input.message?.trim() || '₮100,000-с дээш захиалгад УБ дотор үнэгүй хүргэнэ!',
      ctaLabel: input.ctaLabel?.trim() || 'Дэлгэрэнгүй →',
      ctaHref: input.ctaHref?.trim() || '/trade',
      enabled: input.enabled ?? true,
    };
  }

  private requireAdmin(ctx: RequestContext) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) {
      throw new Error('Админ эрх шаардлагатай');
    }
  }

  private getImageExtension(mimeType: string) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/jpeg') return 'jpg';
    if (mimeType === 'image/webp') return 'webp';
    throw new Error('Зөвхөн PNG, JPG, WEBP зураг оруулна уу');
  }
}
