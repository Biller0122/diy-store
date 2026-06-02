export const GET_DRIVER_PROFILE = `
  query GetDriverProfile($id: ID!) {
    getDriverProfile(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      vehicleModel
      status
      isOnline
      currentLat
      currentLng
      rating
      totalDeliveries
      todayEarnings
      totalEarnings
      bankName
      bankAccount
      createdAt
    }
  }
`;

export const GET_DRIVER_DELIVERY_HISTORY = `
  query DriverHistory($driverId: String!, $limit: Int) {
    deliveryHistoryForDriver(driverId: $driverId, limit: $limit) {
      id
      orderNumber
      customerName
      dropoffAddress
      distance
      finalFee
      proposedFee
      status
      pickupStops {
        supplierId
        supplierName
        district
        address
      }
      orderItems {
        name
        qty
        price
      }
      updatedAt
    }
  }
`;

export const GET_ACTIVE_ORDER = `
  query ActiveDeliveriesForDriver($driverId: String!) {
    activeDeliveriesForDriver(driverId: $driverId) {
      id
      orderId
      orderNumber
      customerName
      customerPhone
      dropoffAddress
      dropoffLat
      dropoffLng
      distance
      estimatedDuration
      proposedFee
      status
      pickupStops {
        supplierId
        supplierName
        district
        address
        phone
        lat
        lng
        status
      }
      orderItems {
        supplierId
        name
        qty
      }
    }
  }
`;
