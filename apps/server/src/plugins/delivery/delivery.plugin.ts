import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { DeliveryRequest } from './delivery-request.entity';
import { OrderNumberCounter } from './order-number-counter.entity';
import { DeliveryResolver } from './delivery.resolver';

const DELIVERY_SCHEMA_EXTENSION = `
  type PickupStop {
    supplierId: String!
    supplierName: String!
    district: String
    address: String!
    phone: String
    lat: Float!
    lng: Float!
    status: String!
  }

  input PickupStopInput {
    supplierId: String!
    supplierName: String!
    district: String
    address: String!
    phone: String
    lat: Float!
    lng: Float!
    status: String
  }

  type DeliveryOrderItem {
    supplierId: String!
    supplierName: String!
    productId: String
    variantId: String
    name: String!
    sku: String
    qty: Int!
    price: Int!
  }

  input DeliveryOrderItemInput {
    supplierId: String!
    supplierName: String!
    productId: String
    variantId: String
    name: String!
    sku: String
    qty: Int!
    price: Int!
  }

  type DeliveryRequest {
    id: ID!
    orderId: String!
    orderNumber: String!
    customerId: String!
    customerName: String!
    customerPhone: String!
    pickupStops: [PickupStop!]!
    orderItems: [DeliveryOrderItem!]!
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

  extend type Query {
    deliveryRequest(orderId: String!): DeliveryRequest
    activeDeliveriesForDriver(driverId: String!): [DeliveryRequest!]!
    deliveryHistoryForDriver(driverId: String!, limit: Int): [DeliveryRequest!]!
    availableDeliveries: [DeliveryRequest!]!
    getActiveDeliveries: [DeliveryRequest!]!
  }

  extend type Mutation {
    createDeliveryRequest(
      orderId: String!
      customerId: String!
      customerName: String!
      customerPhone: String!
      pickupStops: [PickupStopInput!]
      orderItems: [DeliveryOrderItemInput!]
      orderTotal: Int
      paymentMethod: String
      dropoffAddress: String!
      dropoffLat: Float!
      dropoffLng: Float!
    ): DeliveryRequest!
    acceptDelivery(deliveryId: ID!, driverId: String!): DeliveryRequest!
    rejectDelivery(deliveryId: ID!, driverId: String!): DeliveryRequest!
    updateDeliveryStatus(deliveryId: ID!, status: String!): DeliveryRequest!
    updateDeliveryLocation(deliveryId: ID!, lat: Float!, lng: Float!): DeliveryRequest!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([DeliveryRequest, OrderNumberCounter])],
  providers: [DeliveryResolver],
  entities: [DeliveryRequest, OrderNumberCounter],
  shopApiExtensions: {
    schema: gql(DELIVERY_SCHEMA_EXTENSION),
    resolvers: [DeliveryResolver],
  },
  adminApiExtensions: {
    schema: gql(DELIVERY_SCHEMA_EXTENSION),
    resolvers: [DeliveryResolver],
  },
})
export class DeliveryPlugin {}
