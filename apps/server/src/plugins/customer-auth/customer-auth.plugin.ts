import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { EmailOtpService } from '../../services/email-otp.service';
import { CustomerAuthResolver } from './customer-auth.resolver';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerOtp } from './customer-otp.entity';

const CUSTOMER_AUTH_SCHEMA_EXTENSION = gql`
  type CustomerAuthCustomer {
    id: ID!
    firstName: String!
    lastName: String!
    emailAddress: String!
    phoneNumber: String
  }

  type CustomerOtpRequestResult {
    success: Boolean!
    message: String!
    emailAddress: String
    otp: String
  }

  type CustomerAuthResult {
    success: Boolean!
    message: String!
    token: String
    customer: CustomerAuthCustomer
  }

  extend type Mutation {
    requestCustomerEmailOtp(emailAddress: String!): CustomerOtpRequestResult!
    verifyCustomerEmailOtp(emailAddress: String!, otp: String!): CustomerAuthResult!
    customerGoogleLogin(credential: String!): CustomerAuthResult!
    requestCustomerPasswordResetOtp(emailAddress: String!): CustomerOtpRequestResult!
    resetCustomerPasswordWithOtp(emailAddress: String!, otp: String!, password: String!): CustomerAuthResult!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([CustomerOtp])],
  providers: [CustomerAuthResolver, CustomerAuthService, EmailOtpService],
  entities: [CustomerOtp],
  shopApiExtensions: {
    schema: CUSTOMER_AUTH_SCHEMA_EXTENSION,
    resolvers: [CustomerAuthResolver],
  },
})
export class CustomerAuthPlugin {}
