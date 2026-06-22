import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { CmsResolver } from './cms.resolver';
import { HomepageBanner } from './homepage-banner.entity';
import { SiteAnnouncement } from './site-announcement.entity';

const CMS_SCHEMA_EXTENSION = gql`
  type SiteAnnouncement {
    id: ID!
    title: String!
    message: String!
    ctaLabel: String!
    ctaHref: String!
    enabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type HomepageBanner {
    id: ID!
    title: String!
    subtitle: String
    eyebrow: String
    ctaLabel: String
    ctaHref: String
    imageUrl: String
    accentColor: String!
    sortOrder: Int!
    enabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input HomepageBannerInput {
    title: String
    subtitle: String
    eyebrow: String
    ctaLabel: String
    ctaHref: String
    imageUrl: String
    accentColor: String
    sortOrder: Int
    enabled: Boolean
  }

  input HomepageBannerImageInput {
    filename: String
    mimeType: String!
    dataUrl: String!
  }

  input SiteAnnouncementInput {
    title: String
    message: String
    ctaLabel: String
    ctaHref: String
    enabled: Boolean
  }

  extend type Query {
    siteAnnouncement: SiteAnnouncement
    adminSiteAnnouncement: SiteAnnouncement!
    homepageBanners: [HomepageBanner!]!
    adminHomepageBanners: [HomepageBanner!]!
  }

  extend type Mutation {
    updateSiteAnnouncement(input: SiteAnnouncementInput!): SiteAnnouncement!
    createHomepageBanner(input: HomepageBannerInput!): HomepageBanner!
    updateHomepageBanner(id: ID!, input: HomepageBannerInput!): HomepageBanner!
    deleteHomepageBanner(id: ID!): Boolean!
    uploadHomepageBannerImage(input: HomepageBannerImageInput!): String!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([HomepageBanner, SiteAnnouncement])],
  providers: [CmsResolver],
  entities: [HomepageBanner, SiteAnnouncement],
  shopApiExtensions: {
    schema: CMS_SCHEMA_EXTENSION,
    resolvers: [CmsResolver],
  },
  adminApiExtensions: {
    schema: CMS_SCHEMA_EXTENSION,
    resolvers: [CmsResolver],
  },
})
export class CmsPlugin {}
