import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Customer, Driver, Order, PaginatedList, Product, Supplier } from '@diy-store/types';
import { shopFetch } from './client';
import {
  ACTIVE_CUSTOMER_QUERY,
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  MY_ORDERS_QUERY,
  ORDER_DETAIL_QUERY,
  PRODUCTS_QUERY,
} from './queries';

type LoginVariables = {
  username: string;
  password: string;
};

type AuthResponse<T> = {
  success: boolean;
  user?: T;
  token?: string;
  message?: string;
};

const SUPPLIERS_QUERY = `
  query Suppliers {
    suppliers {
      items {
        id
        businessName
        slug
        description
        logo
        rating
        reviewCount
        productCount
        district
        address
        phone
      }
    }
  }
`;

const DRIVER_STATUS_QUERY = `
  query DriverStatus($id: ID!) {
    getDriverProfile(id: $id) {
      id
      firstName
      lastName
      phone
      vehicleType
      vehiclePlate
      vehicleModel
      rating
      totalDeliveries
      todayEarnings
      totalEarnings
      isOnline
      currentLat
      currentLng
    }
  }
`;

const SUPPLIER_LOGIN_MUTATION = `
  mutation SupplierLogin($phone: String!) {
    loginSupplier(phone: $phone) {
      success
      message
      phone
    }
  }
`;

const DRIVER_LOGIN_MUTATION = `
  mutation DriverLogin($phone: String!) {
    loginDriver(phone: $phone) {
      success
      message
      phone
    }
  }
`;

export function useProducts(options?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      const data = await shopFetch<{ products: PaginatedList<Product> }>(PRODUCTS_QUERY, { options });
      return data.products;
    },
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const data = await shopFetch<{ suppliers: { items: Supplier[] } }>(SUPPLIERS_QUERY);
      return data.suppliers.items;
    },
  });
}

export function useOrder(orderId?: string) {
  return useQuery({
    queryKey: ['order', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const data = await shopFetch<{ order: Order }>(ORDER_DETAIL_QUERY, { id: orderId });
      return data.order;
    },
  });
}

export function useDriverStatus(driverId?: string) {
  return useQuery({
    queryKey: ['driver-status', driverId],
    enabled: Boolean(driverId),
    queryFn: async () => {
      const data = await shopFetch<{ getDriverProfile: Driver }>(DRIVER_STATUS_QUERY, { id: driverId });
      return data.getDriverProfile;
    },
  });
}

export function useCustomerAuth() {
  const queryClient = useQueryClient();
  const activeCustomer = useQuery({
    queryKey: ['active-customer'],
    queryFn: async () => {
      const data = await shopFetch<{ activeCustomer: Customer | null }>(ACTIVE_CUSTOMER_QUERY);
      return data.activeCustomer;
    },
  });

  const login = useMutation({
    mutationFn: async (variables: LoginVariables): Promise<AuthResponse<Customer>> => {
      const data = await shopFetch<{ login: Customer | { message: string } }>(LOGIN_MUTATION, variables);
      if ('message' in data.login) return { success: false, message: data.login.message };
      return { success: true, user: data.login };
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['active-customer'] }),
  });

  const logout = useMutation({
    mutationFn: async () => shopFetch<{ logout: { success: boolean } }>(LOGOUT_MUTATION),
    onSuccess: () => void queryClient.clear(),
  });

  const orders = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const data = await shopFetch<{ activeCustomer: { orders: PaginatedList<Order> } | null }>(MY_ORDERS_QUERY);
      return data.activeCustomer?.orders.items ?? [];
    },
  });

  return { activeCustomer, login, logout, orders };
}

export function useSupplierAuth() {
  const login = useMutation({
    mutationFn: async (phone: string): Promise<AuthResponse<Supplier>> => {
      const data = await shopFetch<{ loginSupplier: { success: boolean; message: string; phone?: string } }>(
        SUPPLIER_LOGIN_MUTATION,
        { phone },
      );
      return { success: data.loginSupplier.success, message: data.loginSupplier.message };
    },
  });
  return { login };
}

export function useDriverAuth() {
  const login = useMutation({
    mutationFn: async (phone: string): Promise<AuthResponse<Driver>> => {
      const data = await shopFetch<{ loginDriver: { success: boolean; message: string; phone?: string } }>(
        DRIVER_LOGIN_MUTATION,
        { phone },
      );
      return { success: data.loginDriver.success, message: data.loginDriver.message };
    },
  });
  return { login };
}
