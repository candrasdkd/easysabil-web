import { create } from 'zustand';
import { CACHE_TTL, isCacheFresh } from '../lib/cache';
import { getErrorMessage } from '../lib/errors';
import {
    getOrderDropdowns,
    getOrders,
    markOrderPaid,
    removeOrder,
    saveOrder as persistOrder,
} from '../repositories/ordersRepository';
import type { DataDropdown, DataOrder } from '../types/Order';

interface MutationResult {
    success: boolean;
    error?: string;
}

interface OrdersState {
    orders: DataOrder[];
    loading: boolean;
    uploading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    lastFilterKey: string | null;
    error: string | null;
    fetchOrders: (categoryFilterId: string | null, showAllData: boolean) => Promise<void>;
    saveOrder: (
        orderData: Partial<DataOrder>,
        isUpdate: boolean,
        id?: number | string | null,
    ) => Promise<MutationResult>;
    deleteOrder: (id: number | string) => Promise<MutationResult>;
    updatePayment: (
        id: number | string,
        price: number,
        moneyHolder?: string,
        paymentMethod?: string,
    ) => Promise<MutationResult>;
    invalidate: () => void;
}

let activeOrdersRequest = 0;

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    loading: false,
    uploading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastFilterKey: null,
    error: null,

    fetchOrders: async (categoryFilterId, showAllData) => {
        const filterKey = `${categoryFilterId ?? 'all'}:${showAllData}`;
        const { loading, lastFetchedAt, lastFilterKey } = get();
        const cacheIsFresh = isCacheFresh(lastFetchedAt, CACHE_TTL.standard)
            && lastFilterKey === filterKey;

        if (cacheIsFresh || (loading && lastFilterKey === filterKey)) return;

        const requestId = ++activeOrdersRequest;
        set({ loading: true, lastFilterKey: filterKey, error: null });
        try {
            const orders = await getOrders(categoryFilterId, showAllData);
            if (requestId !== activeOrdersRequest) return;
            set({
                orders,
                lastFetchedAt: Date.now(),
                loading: false,
                isInitialized: true,
            });
        } catch (error) {
            if (requestId !== activeOrdersRequest) return;
            set({ loading: false, error: getErrorMessage(error, 'Gagal mengambil pesanan') });
        }
    },

    saveOrder: async (orderData, isUpdate, id) => {
        set({ uploading: true });
        try {
            await persistOrder(orderData, isUpdate, id);
            set({ lastFetchedAt: null, isInitialized: false });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error, 'Gagal menyimpan pesanan') };
        } finally {
            set({ uploading: false });
        }
    },

    deleteOrder: async (id) => {
        set({ uploading: true });
        try {
            await removeOrder(id);
            set({ lastFetchedAt: null, isInitialized: false });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error, 'Gagal menghapus pesanan') };
        } finally {
            set({ uploading: false });
        }
    },

    updatePayment: async (id, price, moneyHolder = 'Fachih', paymentMethod = 'Cash') => {
        set({ uploading: true });
        try {
            await markOrderPaid(id, price, moneyHolder, paymentMethod);
            set({ lastFetchedAt: null, isInitialized: false });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error, 'Gagal memperbarui pembayaran') };
        } finally {
            set({ uploading: false });
        }
    },

    invalidate: () => {
        activeOrdersRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));

interface DropdownsState {
    dataDropdownSensus: DataDropdown[];
    dataDropdownCategory: DataDropdown[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    error: string | null;
    fetchDropdowns: () => Promise<void>;
    invalidate: () => void;
}

let activeDropdownsRequest = 0;

export const useOrderDropdownsStore = create<DropdownsState>((set, get) => ({
    dataDropdownSensus: [],
    dataDropdownCategory: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    error: null,

    fetchDropdowns: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheFresh(lastFetchedAt, CACHE_TTL.standard)) return;

        const requestId = ++activeDropdownsRequest;
        set({ loading: true, error: null });
        try {
            const { members, categories } = await getOrderDropdowns();
            if (requestId !== activeDropdownsRequest) return;
            set({
                dataDropdownSensus: members,
                dataDropdownCategory: categories,
                loading: false,
                isInitialized: true,
                lastFetchedAt: Date.now(),
            });
        } catch (error) {
            if (requestId !== activeDropdownsRequest) return;
            set({ loading: false, error: getErrorMessage(error, 'Gagal mengambil pilihan pesanan') });
        }
    },

    invalidate: () => {
        activeDropdownsRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));
