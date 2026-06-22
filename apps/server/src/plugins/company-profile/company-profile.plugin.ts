import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { CompanyProfileResolver } from './company-profile.resolver';

/**
 * Барилгын компани хэрэглэгчийн нийтийн профайл (дэлгүүрийн профайлтай адил).
 * Customer customFields дээр суурилна (шинэ хүснэгт хэрэггүй). Нэвтэрсэн customer
 * өөрийн компанийн нэр, лого, ковер, тайлбар, ажлын зургуудаа удирдана.
 */
const COMPANY_PROFILE_SCHEMA = gql`
  type CompanyProfile {
    id: ID!
    isCompany: Boolean!
    companyName: String
    companySlug: String
    companyLogo: String
    companyCover: String
    companyPhone: String
    companyDescription: String
    companyPortfolio: [String!]!
  }

  type CompanyProfileList {
    items: [CompanyProfile!]!
    total: Int!
  }

  enum CompanyImageTarget {
    LOGO
    COVER
    PORTFOLIO
  }

  input UpdateCompanyProfileInput {
    companyName: String
    companyPhone: String
    companyDescription: String
    companyPortfolio: [String!]
    isCompany: Boolean
  }

  input CompanyProfileImageInput {
    filename: String!
    mimeType: String!
    dataUrl: String!
    target: CompanyImageTarget!
  }

  extend type Query {
    myCompanyProfile: CompanyProfile
    companyProfile(slug: String!): CompanyProfile
    companyProfiles(skip: Int, take: Int): CompanyProfileList!
  }

  extend type Mutation {
    updateCompanyProfile(input: UpdateCompanyProfileInput!): CompanyProfile!
    uploadCompanyProfileImage(input: CompanyProfileImageInput!): String!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CompanyProfileResolver],
  shopApiExtensions: {
    schema: COMPANY_PROFILE_SCHEMA,
    resolvers: [CompanyProfileResolver],
  },
})
export class CompanyProfilePlugin {}
