import { create } from 'zustand';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import { type Member } from '../types/Member';

// Cache TTL: 10 menit
const CACHE_TTL_MS = 10 * 60 * 1000;

const isCacheValid = (lastFetchedAt: number | null) =>
    lastFetchedAt !== null && Date.now() - lastFetchedAt < CACHE_TTL_MS;

// ─────────────────────────────────────────────────────────
// 1. ALL ACTIVE MEMBERS STORE
//    Dipakai oleh: TableTotalSensus, AttendanceLog
// ─────────────────────────────────────────────────────────
interface AllMembersState {
    members: Member[];
    loading: boolean;
    isInitialized: boolean; // true setelah fetch pertama selesai
    lastFetchedAt: number | null;
    fetchMembers: () => Promise<void>;
    invalidate: () => void;
}

export const useMembersStore = create<AllMembersState>((set, get) => ({
    members: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,

    fetchMembers: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheValid(lastFetchedAt)) return;

        set({ loading: true });
        try {
            const q = query(collection(db, 'sensus'), where('is_active', '==', true));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as Member[];
            set({ members: data, lastFetchedAt: Date.now(), loading: false, isInitialized: true });
        } catch (err) {
            console.error('Gagal ambil data members:', err);
            set({ loading: false });
        }
    },

    invalidate: () => set({ lastFetchedAt: null }),
}));

// ─────────────────────────────────────────────────────────
// 2. ROLE-BASED MEMBERS STORE
//    Dipakai oleh: DashboardPage, MemberListPage
//    Data di-filter sesuai role user yang login
// ─────────────────────────────────────────────────────────
const MUDA_LEVELS = ['Pra Nikah', 'Pra Remaja', 'Remaja'];

interface RoleProfile {
    status: number;
    kelompok?: string;
}

interface RoleMembersState {
    members: Member[];
    loading: boolean;
    isInitialized: boolean; // true setelah fetch pertama selesai
    lastFetchedAt: number | null;
    lastProfileKey: string | null;
    fetchByRole: (profile: RoleProfile) => Promise<void>;
    invalidate: () => void;
}

export const useRoleMembersStore = create<RoleMembersState>((set, get) => ({
    members: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastProfileKey: null,

    fetchByRole: async (profile: RoleProfile) => {
        const { loading, lastFetchedAt, lastProfileKey } = get();
        const profileKey = `${profile.status}:${profile.kelompok ?? ''}`;

        const cacheOk = isCacheValid(lastFetchedAt) && lastProfileKey === profileKey;
        if (loading || cacheOk) return;

        set({ loading: true, lastProfileKey: profileKey });
        try {
            const { status, kelompok } = profile;
            let allMembers: Member[] = [];

            if (status === 0 || status === 1 || status === 2) {
                const snap = await getDocs(
                    query(collection(db, 'sensus'), orderBy('name', 'asc'))
                );
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as Member[];

            } else if (status === 3) {
                const snap = await getDocs(
                    query(collection(db, 'sensus'),
                        where('kelompok', '==', kelompok),
                        orderBy('name', 'asc'))
                );
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as Member[];

            } else if (status === 4) {
                const snap = await getDocs(
                    query(collection(db, 'sensus'), orderBy('name', 'asc'))
                );
                const all = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as Member[];
                allMembers = all.filter(m => MUDA_LEVELS.includes(m.level));

            } else if (status === 5) {
                const snap = await getDocs(
                    query(collection(db, 'sensus'),
                        where('kelompok', '==', kelompok),
                        orderBy('name', 'asc'))
                );
                const byKelompok = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as Member[];
                allMembers = byKelompok.filter(m => MUDA_LEVELS.includes(m.level));
            }

            set({ members: allMembers, lastFetchedAt: Date.now(), loading: false, isInitialized: true });
        } catch (err) {
            console.error('Gagal ambil data members (role):', err);
            set({ loading: false });
        }
    },

    invalidate: () => set({ lastFetchedAt: null, isInitialized: false }),
}));
