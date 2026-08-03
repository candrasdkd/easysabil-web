import { create } from 'zustand';
import { CACHE_TTL, isCacheFresh } from '../lib/cache';
import { getErrorMessage } from '../lib/errors';
import {
    getOrderCategories,
    removeOrderCategory,
    saveOrderCategory,
} from '../repositories/categoryOrdersRepository';
import type { OrderCategory, OrderCategoryInput } from '../types/Order';

export type { OrderCategory } from '../types/Order';

interface MutationResult {
    success: boolean;
    error?: string;
}

interface CategoryOrdersState {
    categories: OrderCategory[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    error: string | null;
    fetchCategories: () => Promise<void>;
    saveCategory: (data: OrderCategoryInput, id?: string) => Promise<MutationResult>;
    deleteCategory: (id: string) => Promise<MutationResult>;
    invalidate: () => void;
}

let activeCategoriesRequest = 0;

export const useCategoryOrdersStore = create<CategoryOrdersState>((set, get) => ({
    categories: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    error: null,

    fetchCategories: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheFresh(lastFetchedAt, CACHE_TTL.standard)) return;

        const requestId = ++activeCategoriesRequest;
        set({ loading: true, error: null });
        try {
            const categories = await getOrderCategories();
            if (requestId !== activeCategoriesRequest) return;
            set({
                categories,
                lastFetchedAt: Date.now(),
                loading: false,
                isInitialized: true,
            });
        } catch (error) {
            if (requestId !== activeCategoriesRequest) return;
            set({
                loading: false,
                error: getErrorMessage(error, 'Gagal mengambil kategori'),
            });
        }
    },

    saveCategory: async (data, id) => {
        try {
            await saveOrderCategory(data, id);
            set({ lastFetchedAt: null, isInitialized: false });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error, 'Gagal menyimpan kategori') };
        }
    },

    deleteCategory: async (id) => {
        try {
            await removeOrderCategory(id);
            set({ lastFetchedAt: null, isInitialized: false });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error, 'Gagal menghapus kategori') };
        }
    },

    invalidate: () => {
        activeCategoriesRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));
