import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { Supplier } from './supplier.entity';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';

const SUPPLIER_SCHEMA_EXTENSION = gql`
  type SupplierList {
    items: [Supplier!]!
    total: Int!
  }

  type SupplierStatusHistoryEntry {
    status: String!
    reason: String
    at: String!
  }

  type Supplier {
    id: ID!
    businessName: String!
    slug: String!
    logo: String
    description: String
    ownerName: String!
    phone: String!
    email: String!
    passwordHash: String
    address: String
    district: String
    khoroo: String
    lat: Float
    lng: Float
    bankAccount: String
    bankName: String
    bankAccountName: String
    registrationNumber: String
    commissionRate: Float!
    status: String!
    rejectionReason: String
    pickupEnabled: Boolean!
    deliveryEnabled: Boolean!
    rating: Float!
    reviewCount: Int!
    productCount: Int!
    statusHistory: [SupplierStatusHistoryEntry!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input WorkingHoursInput {
    weekdaysStart: String
    weekdaysEnd: String
    saturdayStart: String
    saturdayEnd: String
    sundayClosed: Boolean
    sundayStart: String
    sundayEnd: String
  }

  input RegisterSupplierInput {
    ownerName: String!
    phone: String!
  }

  input VerifySupplierOTPInput {
    phone: String!
    otp: String!
  }

  type SupplierRegistrationResult {
    success: Boolean!
    message: String!
    phone: String
  }

  type SupplierOTPResult {
    success: Boolean!
    message: String!
    supplierId: String
    token: String
  }

  input CreateSupplierInput {
    businessName: String!
    slug: String!
    logo: String
    description: String
    ownerName: String!
    phone: String!
    email: String!
    address: String
    district: String
    khoroo: String
    lat: Float
    lng: Float
    bankAccount: String
    bankName: String
    bankAccountName: String
    registrationNumber: String
    commissionRate: Float
  }

  input UpdateSupplierInput {
    businessName: String
    logo: String
    description: String
    ownerName: String
    phone: String
    address: String
    district: String
    khoroo: String
    lat: Float
    lng: Float
    bankAccount: String
    bankName: String
    commissionRate: Float
  }

  extend type Query {
    suppliers(status: String, take: Int, skip: Int): SupplierList!
    getAllSuppliers: SupplierList!
    supplier(id: ID!): Supplier
    supplierBySlug(slug: String!): Supplier
  }

  extend type Mutation {
    createSupplier(input: CreateSupplierInput!): Supplier!
    updateSupplier(id: ID!, input: UpdateSupplierInput!): Supplier!
    registerSupplier(input: RegisterSupplierInput!): SupplierRegistrationResult!
    verifySupplierOTP(input: VerifySupplierOTPInput!): SupplierOTPResult!
    updateSupplierStatus(id: ID!, status: String!, reason: String): Supplier!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([Supplier])],
  providers: [SupplierResolver, SupplierService],
  entities: [Supplier as any],
  shopApiExtensions: {
    schema: SUPPLIER_SCHEMA_EXTENSION,
    resolvers: [SupplierResolver],
  },
  adminApiExtensions: {
    schema: SUPPLIER_SCHEMA_EXTENSION,
    resolvers: [SupplierResolver],
  },
})
export class SupplierPlugin {}
