import { create } from 'zustand';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/client';

// Cache TTL: 10 menit
const CACHE_TTL_MS = 10 * 60 * 1000;

const isCacheValid = (lastFetchedAt: number | null) =>
    lastFetchedAt !== null && Date.now() - lastFetchedAt < CACHE_TTL_MS;

export interface OrderCategory {
    id: string;
    name: string;
    price: number;
    year: number;
}

interface CategoryOrdersState {
    categories: OrderCategory[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    error: string | null;
    fetchCategories: () => Promise<void>;
    saveCategory: (data: { name: string; price: number; year: number }, id?: string) => Promise<{ success: boolean; error?: string }>;
    deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
    invalidate: () => void;
}

export const useCategoryOrdersStore = create<CategoryOrdersState>((set, get) => ({
    categories: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    error: null,

    fetchCategories: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheValid(lastFetchedAt)) return;

        set({ loading: true, error: null });
        try {
            const q = query(collection(db, 'category_orders'), orderBy('year', 'desc'));
            const snap = await getDocs(q);
            const data: OrderCategory[] = snap.docs.map(doc => {
                const r = doc.data();
                return {
                    id: doc.id,
                    name: r.name,
                    year: Number(r.year),
                    price: r.price === null ? 0 : Number(r.price),
                };
            });
            set({ categories: data, lastFetchedAt: Date.now(), loading: false, isInitialized: true });
        } catch (err: any) {
            set({ loading: false, error: err.message, categories: [] });
        }
    },

    saveCategory: async (data, id) => {
        try {
            if (id) {
                await updateDoc(doc(db, 'category_orders', id), data);
            } else {
                await addDoc(collection(db, 'category_orders'), data);
            }
            // Invalidate agar re-fetch setelah mutasi
            set({ lastFetchedAt: null });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    deleteCategory: async (id) => {
        try {
            await deleteDoc(doc(db, 'category_orders', id));
            set({ lastFetchedAt: null });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    invalidate: () => set({ lastFetchedAt: null, isInitialized: false }),
}));
