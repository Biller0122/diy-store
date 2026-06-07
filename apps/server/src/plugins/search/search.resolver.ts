import { Args, Query, Resolver } from '@nestjs/graphql';
import { Allow, Permission } from '@vendure/core';
import { EmbeddingService } from './embedding.service';

@Resolver()
export class SearchResolver {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Query()
  @Allow(Permission.Public)
  async semanticSearch(@Args('query') query: string, @Args('take') take = 20) {
    return this.embeddingService.semanticSearch(query, take);
  }
}
