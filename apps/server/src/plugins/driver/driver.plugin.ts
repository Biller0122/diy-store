import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import gql from 'graphql-tag';
import { Driver } from './driver.entity';
import { DriverResolver } from './driver.resolver';
import { DriverService } from './driver.service';

const DRIVER_SCHEMA_EXTENSION = gql`
  type Driver {
    id: ID!
    firstName: String!
    lastName: String!
    phone: String!
    vehicleType: String!
    vehiclePlate: String
    vehicleModel: String
    status: String!
    isOnline: Boolean!
    currentLat: Float
    currentLng: Float
    rating: Float!
    totalDeliveries: Int!
    todayEarnings: Int!
    totalEarnings: Int!
    bankName: String
    bankAccount: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DriverAuthResult {
    success: Boolean!
    message: String!
    phone: String
  }

  type DriverOTPResult {
    success: Boolean!
    message: String!
    driverId: String
    token: String
  }

  extend type Query {
    drivers(status: String): [Driver!]!
    driver(id: ID!): Driver
    getDriverProfile(id: ID!): Driver
    getNearbyDrivers(lat: Float!, lng: Float!, radiusKm: Float): [Driver!]!
  }

  extend type Mutation {
    registerDriver(ownerName: String!, phone: String!): DriverAuthResult!
    loginDriver(phone: String!): DriverAuthResult!
    loginDriverByPassword(email: String!, password: String!): DriverOTPResult!
    verifyDriverOTP(phone: String!, otp: String!): DriverOTPResult!
    updateDriverLocation(id: ID!, lat: Float!, lng: Float!): Driver
    setOnlineStatus(id: ID!, isOnline: Boolean!): Driver
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule, TypeOrmModule.forFeature([Driver])],
  providers: [DriverResolver, DriverService],
  entities: [Driver as any],
  shopApiExtensions: {
    schema: DRIVER_SCHEMA_EXTENSION,
    resolvers: [DriverResolver],
  },
  adminApiExtensions: {
    schema: DRIVER_SCHEMA_EXTENSION,
    resolvers: [DriverResolver],
  },
})
export class DriverPlugin {}
