import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { EmbeddingService } from './embedding.service';
import { ProjectKitService } from './project-kit.service';

@Resolver()
export class SearchResolver {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly projectKitService: ProjectKitService,
  ) {}

  @Query()
  @Allow(Permission.Public)
  async semanticSearch(@Args('query') query: string, @Args('take') take = 20) {
    return this.embeddingService.semanticSearch(query, take);
  }

  /**
   * "Ажил → барааны багц" зөвлөх. Хэрэглэгчийн ажлын зорилгод хэрэгтэй барааг
   * утга төрлөөр бүлэглэж, тоо хэмжээ+заавал/нэмэлтийг ялгаж буцаана.
   */
  @Query()
  @Allow(Permission.Public)
  async projectKit(@Args('query') query: string, @Args('take') take = 24) {
    return this.projectKitService.projectKit(query, take);
  }

  /**
   * Admin-only: (re)generate embeddings for every product missing one. Runs in
   * the background so the request returns immediately and is not bound by the
   * HTTP timeout. Use after the embedding columns are (re)created.
   */
  @Mutation()
  @Allow(Permission.Public)
  async reindexEmbeddings(@Ctx() ctx: RequestContext) {
    if (ctx.apiType !== 'admin' || !ctx.activeUserId) {
      throw new Error('Админ эрх шаардлагатай');
    }
    void this.embeddingService
      .indexAllProducts()
      .then((result) => console.log('[Embedding] reindex complete', result))
      .catch((error) => console.error('[Embedding] reindex failed', error));
    return { started: true, message: 'Embedding reindex эхэллээ (background)' };
  }
}
