import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  Allow,
  Ctx,
  ID,
  Customer,
  Order,
  Permission,
  Product,
  RequestContext,
  TransactionalConnection,
} from '@vendure/core';
import { Review, ReviewStatus } from './review.entity';

@Resolver()
export class ReviewResolver {
  constructor(private connection: TransactionalConnection) {}

  @Mutation()
  @Allow(Permission.Authenticated)
  async submitReview(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
    @Args('rating') rating: number,
    @Args('title') title: string,
    @Args('body') body: string,
  ): Promise<Review> {
    if (rating < 1 || rating > 5) {
      throw new Error('Үнэлгээ 1-5 хооронд байх ёстой');
    }
    const customer = await this.getActiveCustomer(ctx);
    const customerId = String(customer.id);
    const repo = this.connection.getRepository(ctx, Review);
    const existing = await repo.findOne({ where: { productId: String(productId), customerId } });
    if (existing) {
      throw new Error('Энэ бараанд нэг л удаа сэтгэгдэл үлдээх боломжтой');
    }

    const review = repo.create({
      productId: String(productId),
      customerId,
      rating,
      title,
      body,
      verifiedPurchase: await this.hasCompletedOrderWithProduct(ctx, customerId, String(productId)),
      status: 'PENDING',
      helpfulCount: 0,
    });
    return repo.save(review);
  }

  @Mutation()
  @Allow(Permission.Authenticated)
  async markHelpful(@Ctx() ctx: RequestContext, @Args('reviewId') reviewId: ID): Promise<Review> {
    const repo = this.connection.getRepository(ctx, Review);
    const review = await repo.findOneOrFail({ where: { id: reviewId as any } });
    review.helpfulCount += 1;
    return repo.save(review);
  }

  @Mutation()
  @Allow(Permission.UpdateCatalog)
  async moderateReview(
    @Ctx() ctx: RequestContext,
    @Args('reviewId') reviewId: ID,
    @Args('status') status: ReviewStatus,
  ): Promise<Review> {
    const repo = this.connection.getRepository(ctx, Review);
    const review = await repo.findOneOrFail({ where: { id: reviewId as any } });
    review.status = status;
    const saved = await repo.save(review);
    if (status === 'APPROVED') {
      await this.updateProductRating(ctx, review.productId);
    }
    return saved;
  }

  @Query()
  async getProductReviews(
    @Ctx() ctx: RequestContext,
    @Args('productId') productId: ID,
    @Args('page', { nullable: true }) page = 1,
    @Args('sort', { nullable: true }) sort = 'latest',
  ): Promise<{ items: Review[]; totalItems: number }> {
    const repo = this.connection.getRepository(ctx, Review);
    const order =
      sort === 'highest' ? { rating: 'DESC' as const } :
      sort === 'helpful' ? { helpfulCount: 'DESC' as const } :
      { createdAt: 'DESC' as const };
    const [items, totalItems] = await repo.findAndCount({
      where: { productId: String(productId), status: 'APPROVED' },
      order,
      skip: Math.max(0, page - 1) * 10,
      take: 10,
    });
    return { items, totalItems };
  }

  @Query()
  @Allow(Permission.UpdateCatalog)
  async getPendingReviews(@Ctx() ctx: RequestContext): Promise<Review[]> {
    return this.connection.getRepository(ctx, Review).find({
      where: { status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
  }

  @Query()
  @Allow(Permission.Authenticated)
  async getMyReviews(@Ctx() ctx: RequestContext): Promise<Review[]> {
    const customer = await this.getActiveCustomer(ctx);
    return this.connection.getRepository(ctx, Review).find({
      where: { customerId: String(customer.id) },
      order: { createdAt: 'DESC' },
    });
  }

  private async getActiveCustomer(ctx: RequestContext): Promise<Customer> {
    const customer = await this.connection
      .getRepository(ctx, Customer)
      .createQueryBuilder('customer')
      .leftJoin('customer.user', 'user')
      .where('user.id = :userId', { userId: ctx.activeUserId })
      .getOne();
    if (!customer) {
      throw new Error('Хэрэглэгч олдсонгүй');
    }
    return customer;
  }

  private async hasCompletedOrderWithProduct(
    ctx: RequestContext,
    customerId: string,
    productId: string,
  ): Promise<boolean> {
    const count = await this.connection
      .getRepository(ctx, Order)
      .createQueryBuilder('order')
      .innerJoin('order.lines', 'line')
      .innerJoin('line.productVariant', 'variant')
      .where('order.customerId = :customerId', { customerId })
      .andWhere('order.state IN (:...states)', {
        states: ['PaymentSettled', 'PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered'],
      })
      .andWhere('variant.productId = :productId', { productId })
      .getCount();
    return count > 0;
  }

  private async updateProductRating(ctx: RequestContext, productId: string) {
    const reviewRepo = this.connection.getRepository(ctx, Review);
    const productRepo = this.connection.getRepository(ctx, Product);
    const approved = await reviewRepo.find({ where: { productId, status: 'APPROVED' } });
    const product = await productRepo.findOne({ where: { id: productId as any } });
    if (!product) return;
    const avgRating = approved.length
      ? approved.reduce((sum, item) => sum + item.rating, 0) / approved.length
      : 0;
    product.customFields = {
      ...product.customFields,
      avgRating: Number(avgRating.toFixed(2)),
      reviewCount: approved.length,
    };
    await productRepo.save(product);
  }
}
