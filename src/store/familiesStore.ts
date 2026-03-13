import { create } from 'zustand';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import { type Familys } from '../types/Member';

// Cache TTL: 10 menit
const CACHE_TTL_MS = 10 * 60 * 1000;

const isCacheValid = (lastFetchedAt: number | null) =>
    lastFetchedAt !== null && Date.now() - lastFetchedAt < CACHE_TTL_MS;

interface RoleProfile {
    status: number;
    kelompok?: string;
}

interface FamiliesState {
    families: Familys[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    lastProfileKey: string | null;
    fetchFamilies: (profile: RoleProfile) => Promise<void>;
    invalidate: () => void;
}

export const useFamiliesStore = create<FamiliesState>((set, get) => ({
    families: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastProfileKey: null,

    fetchFamilies: async (profile: RoleProfile) => {
        const { loading, lastFetchedAt, lastProfileKey } = get();
        const profileKey = `${profile.status}:${profile.kelompok ?? ''}`;

        const cacheOk = isCacheValid(lastFetchedAt) && lastProfileKey === profileKey;
        if (loading || cacheOk) return;

        set({ loading: true, lastProfileKey: profileKey });
        try {
            const { status, kelompok } = profile;

            let q;
            if (status === 3 || status === 5) {
                // Pengurus Kelompok → hanya keluarga kelompoknya
                q = query(
                    collection(db, 'families'),
                    where('kelompok', '==', kelompok),
                    orderBy('name', 'asc')
                );
            } else {
                // Admin & Desa → semua keluarga
                q = query(collection(db, 'families'), orderBy('name', 'asc'));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name ?? '',
                kelompok: doc.data().kelompok ?? '',
            })) as Familys[];

            set({ families: data, lastFetchedAt: Date.now(), loading: false, isInitialized: true });
        } catch (err) {
            console.error('Gagal ambil data families:', err);
            set({ loading: false });
        }
    },

    invalidate: () => set({ lastFetchedAt: null, isInitialized: false }),
}));
