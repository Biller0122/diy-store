import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type { Customer, Driver, Order, OrderStatus, PaginatedList, Product, Supplier } from '@diy-store/types';
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

type DriverLocation = {
  orderId?: string;
  driverId: string;
  lat: number;
  lng: number;
};

type OrderStatusEvent = {
  orderId: string;
  status: OrderStatus | string;
};

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const SOCKET_URL = runtimeEnv?.NEXT_PUBLIC_SOCKET_URL || 'http://52.77.245.218:3002';

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

export function useSocketConnection(room?: { orderId?: string; driverId?: string }) {
  const socket = useMemo<Socket>(() => io(SOCKET_URL, { transports: ['websocket'], autoConnect: false }), []);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => {
      setIsConnected(true);
      if (room?.orderId) socket.emit('order:join', room.orderId);
      if (room?.driverId) socket.emit('driver:join', room.driverId);
    });
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [socket, room?.orderId, room?.driverId]);

  return { socket, isConnected };
}

export function useDriverLocation(orderId?: string) {
  const { socket, isConnected } = useSocketConnection(orderId ? { orderId } : undefined);
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    socket.on('driver:location', (payload: DriverLocation) => setLocation(payload));
    return () => {
      socket.off('driver:location');
    };
  }, [socket]);

  return { location, isConnected };
}

export function useOrderStatus(orderId?: string) {
  const { socket, isConnected } = useSocketConnection(orderId ? { orderId } : undefined);
  const [status, setStatus] = useState<OrderStatusEvent | null>(null);

  useEffect(() => {
    socket.on('order:status', (payload: OrderStatusEvent) => setStatus(payload));
    return () => {
      socket.off('order:status');
    };
  }, [socket]);

  return { status, isConnected };
}
