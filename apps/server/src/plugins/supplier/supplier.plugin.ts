import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { Supplier } from './supplier.entity';
import { SupplierProduct } from './supplier-product.entity';
import { SupplierResolver } from './supplier.resolver';
import { SupplierService } from './supplier.service';
import { EmailOtpService } from '../../services/email-otp.service';
import { DeliveryRequest } from '../delivery/delivery-request.entity';
import { EmbeddingService } from '../search/embedding.service';

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

  type SupplierProductList {
    items: [SupplierProduct!]!
    total: Int!
  }

  type SupplierProduct {
    id: ID!
    supplierId: String!
    name: String!
    slug: String!
    description: String
    category: String
    image: String
    price: Int!
    originalPrice: Int
    stock: Int!
    enabled: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input SupplierProductInput {
    supplierId: String!
    name: String!
    slug: String
    description: String
    category: String
    image: String
    price: Int!
    originalPrice: Int
    stock: Int!
    enabled: Boolean
  }

  input SupplierProductUpdateInput {
    name: String
    slug: String
    description: String
    category: String
    image: String
    price: Int
    originalPrice: Int
    stock: Int
    enabled: Boolean
  }

  type SupplierOrderAddress {
    streetLine1: String
    city: String
  }

  type SupplierOrderProduct {
    name: String!
  }

  type SupplierOrderProductVariant {
    name: String!
    product: SupplierOrderProduct!
  }

  type SupplierOrderLine {
    quantity: Int!
    productVariant: SupplierOrderProductVariant!
  }

  type SupplierOrder {
    id: ID!
    code: String!
    state: String!
    total: Int!
    createdAt: DateTime!
    shippingAddress: SupplierOrderAddress
    lines: [SupplierOrderLine!]!
  }

  type SupplierOrderList {
    items: [SupplierOrder!]!
    total: Int!
  }

  type SupplierOrderActionResult {
    success: Boolean!
    message: String!
    order: SupplierOrder
  }

  type SupplierDeliveryOrderItem {
    supplierId: String!
    supplierName: String!
    productId: String
    variantId: String
    name: String!
    sku: String
    qty: Int!
    price: Int!
  }

  type SupplierDeliveryPickupStop {
    supplierId: String!
    supplierName: String!
    district: String
    address: String!
    phone: String
    lat: Float!
    lng: Float!
    status: String!
  }

  type SupplierDeliveryRequest {
    id: ID!
    orderId: String!
    orderNumber: String!
    customerId: String!
    customerName: String!
    customerPhone: String!
    pickupStops: [SupplierDeliveryPickupStop!]!
    orderItems: [SupplierDeliveryOrderItem!]!
    orderTotal: Int!
    paymentMethod: String
    supplierStatus: String!
    dropoffAddress: String!
    dropoffLat: Float!
    dropoffLng: Float!
    distance: Float!
    estimatedDuration: Int!
    proposedFee: Int!
    finalFee: Int!
    status: String!
    driverId: String
    driverLat: Float
    driverLng: Float
    estimatedArrival: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SupplierDeliveryActionResult {
    success: Boolean!
    message: String!
    delivery: SupplierDeliveryRequest
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
    email: String!
    phone: String
    businessName: String
    registrationNumber: String
    district: String
    address: String
  }

  input VerifySupplierOTPInput {
    email: String!
    otp: String!
  }

  type SupplierRegistrationResult {
    success: Boolean!
    message: String!
    email: String
    otp: String
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
    supplierProducts(supplierId: String): SupplierProductList!
    supplierOrders(take: Int, skip: Int): SupplierOrderList!
    supplierDeliveryRequests(supplierId: String!): [SupplierDeliveryRequest!]!
  }

  extend type Mutation {
    createSupplier(input: CreateSupplierInput!): Supplier!
    updateSupplier(id: ID!, input: UpdateSupplierInput!): Supplier!
    deleteSupplier(id: ID!): Boolean!
    registerSupplier(input: RegisterSupplierInput!): SupplierRegistrationResult!
    loginSupplier(email: String!): SupplierRegistrationResult!
    verifySupplierOTP(input: VerifySupplierOTPInput!): SupplierOTPResult!
    createSupplierProduct(input: SupplierProductInput!): SupplierProduct!
    updateSupplierProduct(id: ID!, input: SupplierProductUpdateInput!): SupplierProduct!
    deleteSupplierProduct(id: ID!): Boolean!
    supplierOrderAction(orderId: ID!, action: String!): SupplierOrderActionResult!
    supplierDeliveryAction(deliveryId: ID!, supplierId: String!, action: String!): SupplierDeliveryActionResult!
    updateSupplierStatus(id: ID!, status: String!, reason: String): Supplier!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([Supplier, SupplierProduct, DeliveryRequest])],
  providers: [SupplierResolver, SupplierService, EmailOtpService, EmbeddingService],
  entities: [Supplier as any, SupplierProduct as any],
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
