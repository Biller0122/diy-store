import gql from 'graphql-tag';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { Review } from './review.entity';
import { ReviewResolver } from './review.resolver';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [Review as any],
  shopApiExtensions: {
    schema: gql`
      enum ReviewStatus {
        PENDING
        APPROVED
        REJECTED
      }

      type Review {
        id: ID!
        productId: ID!
        customerId: ID!
        rating: Int!
        title: String!
        body: String!
        verifiedPurchase: Boolean!
        status: ReviewStatus!
        helpfulCount: Int!
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type ReviewList {
        items: [Review!]!
        totalItems: Int!
      }

      extend type Query {
        getProductReviews(productId: ID!, page: Int, sort: String): ReviewList!
        getMyReviews: [Review!]!
        getPendingReviews: [Review!]!
      }

      extend type Mutation {
        submitReview(productId: ID!, rating: Int!, title: String!, body: String!): Review!
        markHelpful(reviewId: ID!): Review!
        moderateReview(reviewId: ID!, status: ReviewStatus!): Review!
      }
    `,
    resolvers: [ReviewResolver],
  },
  adminApiExtensions: {
    schema: gql`
      enum ReviewStatus {
        PENDING
        APPROVED
        REJECTED
      }

      type Review {
        id: ID!
        productId: ID!
        customerId: ID!
        rating: Int!
        title: String!
        body: String!
        verifiedPurchase: Boolean!
        status: ReviewStatus!
        helpfulCount: Int!
        createdAt: DateTime!
        updatedAt: DateTime!
      }

      type ReviewList {
        items: [Review!]!
        totalItems: Int!
      }

      extend type Query {
        getProductReviews(productId: ID!, page: Int, sort: String): ReviewList!
        getMyReviews: [Review!]!
        getPendingReviews: [Review!]!
      }

      extend type Mutation {
        submitReview(productId: ID!, rating: Int!, title: String!, body: String!): Review!
        markHelpful(reviewId: ID!): Review!
        moderateReview(reviewId: ID!, status: ReviewStatus!): Review!
      }
    `,
    resolvers: [ReviewResolver],
  },
})
export class ReviewPlugin {}
