import { create } from 'zustand';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { DataOrder, DataDropdown } from '../types/Order';

// Cache TTL: 10 menit
const CACHE_TTL_MS = 10 * 60 * 1000;

const isCacheValid = (lastFetchedAt: number | null) =>
    lastFetchedAt !== null && Date.now() - lastFetchedAt < CACHE_TTL_MS;

// ─────────────────────────────────────────────────────────
// ORDERS STORE
// ─────────────────────────────────────────────────────────
interface OrdersState {
    orders: DataOrder[];
    loading: boolean;
    uploading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    lastFilterKey: string | null; // track filter changes
    error: string | null;
    fetchOrders: (categoryFilterId: string | null, showAllData: boolean) => Promise<void>;
    saveOrder: (orderData: Partial<DataOrder>, isUpdate: boolean, id?: number | string | null) => Promise<{ success: boolean; error?: string }>;
    deleteOrder: (id: number | string) => Promise<{ success: boolean; error?: string }>;
    updatePayment: (id: number | string, price: number, moneyHolder?: string, paymentMethod?: string) => Promise<{ success: boolean; error?: string }>;
    invalidate: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    orders: [],
    loading: false,
    uploading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastFilterKey: null,
    error: null,

    fetchOrders: async (categoryFilterId: string | null, showAllData: boolean) => {
        const { loading, lastFetchedAt, lastFilterKey } = get();
        const filterKey = `${categoryFilterId ?? 'all'}:${showAllData}`;

        const cacheOk = isCacheValid(lastFetchedAt) && lastFilterKey === filterKey;
        if (loading || cacheOk) return;

        set({ loading: true, lastFilterKey: filterKey, error: null });
        try {
            let q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
            if (categoryFilterId && !showAllData) {
                q = query(
                    collection(db, 'orders'),
                    where('id_category_order', '==', categoryFilterId),
                    orderBy('created_at', 'desc')
                );
            }
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DataOrder[];
            set({ orders: data, lastFetchedAt: Date.now(), loading: false, isInitialized: true });
        } catch (e) {
            set({ loading: false, error: e instanceof Error ? e.message : String(e) });
        }
    },

    saveOrder: async (orderData, isUpdate, id) => {
        set({ uploading: true });
        try {
            if (isUpdate && id) {
                const docRef = doc(db, 'orders', String(id));
                const cleanData = Object.fromEntries(Object.entries(orderData).filter(([_, v]) => v !== undefined));
                await updateDoc(docRef, cleanData);
            } else {
                await addDoc(collection(db, 'orders'), {
                    ...orderData,
                    created_at: new Date()
                });
            }
            // Invalidate cache agar data refresh
            set({ lastFetchedAt: null });
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            set({ uploading: false });
        }
    },

    deleteOrder: async (id) => {
        set({ uploading: true });
        try {
            await deleteDoc(doc(db, 'orders', String(id)));
            set({ lastFetchedAt: null });
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            set({ uploading: false });
        }
    },

    updatePayment: async (id, price, moneyHolder = 'Fachih', paymentMethod = 'Cash') => {
        set({ uploading: true });
        try {
            await updateDoc(doc(db, 'orders', String(id)), {
                actual_price: price,
                is_payment: true,
                payment_method: paymentMethod,
                money_holder: moneyHolder
            });
            set({ lastFetchedAt: null });
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            set({ uploading: false });
        }
    },

    invalidate: () => set({ lastFetchedAt: null, isInitialized: false }),
}));

// ─────────────────────────────────────────────────────────
// ORDER DROPDOWNS STORE
// (Sensus Kelompok 1 + Category Orders)
// ─────────────────────────────────────────────────────────
interface DropdownsState {
    dataDropdownSensus: DataDropdown[];
    dataDropdownCategory: DataDropdown[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    fetchDropdowns: () => Promise<void>;
    invalidate: () => void;
}

export const useOrderDropdownsStore = create<DropdownsState>((set, get) => ({
    dataDropdownSensus: [],
    dataDropdownCategory: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,

    fetchDropdowns: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheValid(lastFetchedAt)) return;

        set({ loading: true });
        try {
            const [sensusSnap, catSnap] = await Promise.all([
                getDocs(query(
                    collection(db, 'sensus'),
                    where('kelompok', '==', 'Kelompok 1'),
                    where('is_active', '==', true),
                    orderBy('name', 'asc')
                )),
                getDocs(query(collection(db, 'category_orders'), orderBy('year', 'desc')))
            ]);

            const sensusData = sensusSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            const catData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            set({
                dataDropdownSensus: sensusData.map((i: any) => ({ label: i.name || '', value: i.name || '', id: i.id })),
                dataDropdownCategory: catData.map((i: any) => ({
                    ...i, label: `${i.name} ${i.year}`, value: `${i.name} ${i.year}`, id: i.id
                })),
                loading: false,
                isInitialized: true,
                lastFetchedAt: Date.now(),
            });
        } catch (err) {
            console.error('Gagal ambil dropdown orders:', err);
            set({ loading: false });
        }
    },

    invalidate: () => set({ lastFetchedAt: null, isInitialized: false }),
}));
