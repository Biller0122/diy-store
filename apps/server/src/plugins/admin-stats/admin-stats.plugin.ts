import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { AdminStatsResolver } from './admin-stats.resolver';
import { Supplier } from '../supplier/supplier.entity';
import { SupplierProduct } from '../supplier/supplier-product.entity';
import { SupplierService } from '../supplier/supplier.service';
import { Driver } from '../driver/driver.entity';
import { DriverService } from '../driver/driver.service';
import { EmailOtpService } from '../../services/email-otp.service';
import { DeliveryRequest } from '../delivery/delivery-request.entity';

const ADMIN_STATS_SCHEMA_EXTENSION = gql`
  type DashboardStats {
    totalOrders: Int!
    todayRevenue: Int!
    activeSuppliers: Int!
    onlineDrivers: Int!
    pendingSuppliers: Int!
    pendingDrivers: Int!
  }

  type AdminOrderSummary {
    id: ID!
    orderNumber: String!
    customerName: String!
    total: Int!
    status: String!
    createdAt: DateTime!
    source: String!
    itemSummary: String
  }

  type AdminOrderSummaryList {
    items: [AdminOrderSummary!]!
    total: Int!
  }

  type CommissionStats {
    thisMonthGMV: Int!
    thisMonthCommission: Int!
    totalSuppliers: Int!
  }

  extend type Query {
    getDashboardStats: DashboardStats!
    getPendingSuppliers: [Supplier!]!
    getPendingDrivers: [Driver!]!
    getSuppliersByStatus(status: String): [Supplier!]!
    getDriversByStatus(status: String): [Driver!]!
    getAllOrders(page: Int, limit: Int): AdminOrderSummaryList!
    getCommissionStats: CommissionStats!
  }

  extend type Mutation {
    adminUpdateSupplierStatus(id: ID!, status: String!): Supplier!
    adminUpdateDriverStatus(id: ID!, status: String!): Driver!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([Supplier, SupplierProduct, Driver, DeliveryRequest])],
  providers: [AdminStatsResolver, SupplierService, DriverService, EmailOtpService],
  adminApiExtensions: {
    schema: ADMIN_STATS_SCHEMA_EXTENSION,
    resolvers: [AdminStatsResolver],
  },
})
export class AdminStatsPlugin {}
