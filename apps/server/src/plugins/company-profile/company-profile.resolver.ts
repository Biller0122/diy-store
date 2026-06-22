import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Readable } from 'stream';
import {
  Allow,
  AssetService,
  Ctx,
  Customer,
  CustomerService,
  ID,
  Permission,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';

type CompanyImageTarget = 'LOGO' | 'COVER' | 'PORTFOLIO';

type UpdateCompanyProfileInput = {
  companyName?: string;
  companyPhone?: string;
  companyDescription?: string;
  companyPortfolio?: string[];
  isCompany?: boolean;
};

type CompanyProfileImageInput = {
  filename: string;
  mimeType: string;
  dataUrl: string;
  target: CompanyImageTarget;
};

type CompanyCustomFields = {
  isCompany?: boolean;
  companyName?: string | null;
  companySlug?: string | null;
  companyLogo?: string | null;
  companyCover?: string | null;
  companyPhone?: string | null;
  companyDescription?: string | null;
  companyPortfolio?: string | null;
};

const MAX_PORTFOLIO = 12;

@Resolver()
export class CompanyProfileResolver {
  constructor(
    private readonly connection: TransactionalConnection,
    private readonly customerService: CustomerService,
    private readonly assetService: AssetService,
  ) {}

  // ---------- Queries ----------

  @Query()
  @Allow(Permission.Public)
  async myCompanyProfile(@Ctx() ctx: RequestContext) {
    const customer = await this.tryActiveCustomer(ctx);
    return customer ? this.toProfile(customer) : null;
  }

  @Query()
  @Allow(Permission.Public)
  async companyProfile(@Ctx() ctx: RequestContext, @Args('slug') slug: string) {
    if (!slug?.trim()) return null;
    const customer = await this.connection.getRepository(ctx, Customer).findOne({
      where: { customFields: { companySlug: slug.trim() } } as any,
    });
    return customer ? this.toProfile(customer) : null;
  }

  @Query()
  @Allow(Permission.Public)
  async companyProfiles(
    @Ctx() ctx: RequestContext,
    @Args('skip') skip = 0,
    @Args('take') take = 24,
  ) {
    const limit = Math.max(1, Math.min(take, 50));
    const [items, total] = await this.connection.getRepository(ctx, Customer).findAndCount({
      where: { customFields: { isCompany: true } } as any,
      order: { updatedAt: 'DESC' },
      skip: Math.max(0, skip),
      take: limit,
    });
    return { items: items.map((c) => this.toProfile(c)), total };
  }

  // ---------- Mutations (active customer) ----------

  @Mutation()
  @Allow(Permission.Public)
  async updateCompanyProfile(
    @Ctx() ctx: RequestContext,
    @Args('input') input: UpdateCompanyProfileInput,
  ) {
    const customer = await this.requireActiveCustomer(ctx);
    const cf = (customer.customFields ?? {}) as CompanyCustomFields;
    const next: CompanyCustomFields = {};

    if (input.companyName !== undefined) {
      next.companyName = input.companyName.trim() || null;
      next.isCompany = true;
      if (!cf.companySlug && next.companyName) {
        next.companySlug = await this.uniqueSlug(ctx, next.companyName, String(customer.id));
      }
    }
    if (input.companyPhone !== undefined) next.companyPhone = input.companyPhone.trim() || null;
    if (input.companyDescription !== undefined) next.companyDescription = input.companyDescription.trim() || null;
    if (input.isCompany !== undefined) next.isCompany = input.isCompany;
    if (input.companyPortfolio !== undefined) {
      next.companyPortfolio = JSON.stringify(input.companyPortfolio.slice(0, MAX_PORTFOLIO));
    }

    const saved = await this.saveFields(ctx, customer, next);
    return this.toProfile(saved);
  }

  @Mutation()
  @Allow(Permission.Public)
  async uploadCompanyProfileImage(
    @Ctx() ctx: RequestContext,
    @Args('input') input: CompanyProfileImageInput,
  ) {
    const customer = await this.requireActiveCustomer(ctx);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(input.mimeType)) {
      throw new Error('Зөвхөн PNG, JPG, WEBP зураг оруулна уу');
    }
    const encoded = input.dataUrl.includes(',') ? input.dataUrl.split(',').pop() : input.dataUrl;
    if (!encoded) throw new Error('Зургийн дата хоосон байна');
    const buffer = Buffer.from(encoded, 'base64');
    if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
      throw new Error('Зургийн хэмжээ 5MB-аас бага байна');
    }

    const safeFilename =
      input.filename.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() || 'company-image.jpg';
    const asset = await this.assetService.createFromFileStream(Readable.from(buffer), safeFilename, ctx);
    if ('errorCode' in asset) throw new Error(asset.message);
    // Windows локалд AssetService backslash-тай зам буцаадаг — URL-д forward slash болгоно.
    const url = (asset.preview || asset.source).replace(/\\/g, '/');

    const cf = (customer.customFields ?? {}) as CompanyCustomFields;
    if (input.target === 'LOGO') {
      await this.saveFields(ctx, customer, { companyLogo: url });
    } else if (input.target === 'COVER') {
      await this.saveFields(ctx, customer, { companyCover: url });
    } else {
      const portfolio = this.parsePortfolio(cf.companyPortfolio);
      portfolio.push(url);
      await this.saveFields(ctx, customer, {
        companyPortfolio: JSON.stringify(portfolio.slice(0, MAX_PORTFOLIO)),
      });
    }
    return url;
  }

  // ---------- Helpers ----------

  private async tryActiveCustomer(ctx: RequestContext): Promise<Customer | null> {
    if (!ctx.activeUserId) return null;
    return (await this.customerService.findOneByUserId(ctx, ctx.activeUserId)) ?? null;
  }

  private async requireActiveCustomer(ctx: RequestContext): Promise<Customer> {
    const customer = await this.tryActiveCustomer(ctx);
    if (!customer) throw new Error('Нэвтрэх шаардлагатай');
    return customer;
  }

  /** customFields-ийг merge хийж repository-оор хадгална (self-service, эрх шалгасан). */
  private async saveFields(ctx: RequestContext, customer: Customer, fields: CompanyCustomFields): Promise<Customer> {
    const repo = this.connection.getRepository(ctx, Customer);
    const merged = { ...(customer.customFields ?? {}), ...fields };
    await repo.update(customer.id as ID, { customFields: merged } as any);
    return (await repo.findOne({ where: { id: customer.id } as any })) ?? customer;
  }

  private async uniqueSlug(ctx: RequestContext, name: string, selfId: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'company';
    const repo = this.connection.getRepository(ctx, Customer);
    let slug = base;
    for (let i = 0; i < 50; i++) {
      const existing = await repo.findOne({ where: { customFields: { companySlug: slug } } as any });
      if (!existing || String(existing.id) === selfId) return slug;
      slug = `${base}-${i + 2}`;
    }
    return `${base}-${Date.now()}`;
  }

  private parsePortfolio(value?: string | null): string[] {
    if (!value) return [];
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  private toProfile(customer: Customer) {
    const cf = (customer.customFields ?? {}) as CompanyCustomFields;
    return {
      id: customer.id,
      isCompany: !!cf.isCompany,
      companyName: cf.companyName ?? null,
      companySlug: cf.companySlug ?? null,
      companyLogo: cf.companyLogo ?? null,
      companyCover: cf.companyCover ?? null,
      companyPhone: cf.companyPhone ?? null,
      companyDescription: cf.companyDescription ?? null,
      companyPortfolio: this.parsePortfolio(cf.companyPortfolio),
    };
  }
}
