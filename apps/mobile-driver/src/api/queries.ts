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

export const GET_DRIVER_EARNINGS = `
  query GetDriverEarnings($driverId: ID!, $period: String!) {
    getDriverEarnings(driverId: $driverId, period: $period) {
      totalDeliveries
      totalEarned
      averageRating
      averagePerDelivery
      chart { label amount count }
      history {
        id
        orderNumber
        date
        supplierDistrict
        customerDistrict
        customerAddress
        fee
        rating
      }
    }
  }
`;

export const GET_DRIVER_DELIVERY_HISTORY = `
  query GetDriverDeliveryHistory($driverId: ID!, $limit: Int) {
    getDriverDeliveryHistory(driverId: $driverId, limit: $limit) {
      id
      orderNumber
      date
      supplierDistrict
      customerDistrict
      customerAddress
      fee
      rating
    }
  }
`;

export const GET_ACTIVE_ORDER = `
  query GetActiveOrder($driverId: ID!) {
    getActiveOrder(driverId: $driverId) {
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
      fee
      status
      pickupStops {
        supplierId
        supplierName
        address
        phone
        lat
        lng
        status
        items { name qty }
      }
    }
  }
`;
