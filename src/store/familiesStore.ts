import { create } from 'zustand';
import { CACHE_TTL, isCacheFresh } from '../lib/cache';
import { getErrorMessage } from '../lib/errors';
import { getFamiliesByRole } from '../repositories/familiesRepository';
import type { RoleProfile } from '../repositories/membersRepository';
import type { Family } from '../types/Member';

interface FamiliesState {
    families: Family[];
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    lastProfileKey: string | null;
    error: string | null;
    fetchFamilies: (profile: RoleProfile) => Promise<void>;
    invalidate: () => void;
}

let activeFamiliesRequest = 0;

export const useFamiliesStore = create<FamiliesState>((set, get) => ({
    families: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastProfileKey: null,
    error: null,

    fetchFamilies: async (profile) => {
        const profileKey = `${profile.status}:${profile.kelompok ?? ''}`;
        const { loading, lastFetchedAt, lastProfileKey } = get();
        const cacheIsFresh = isCacheFresh(lastFetchedAt, CACHE_TTL.standard)
            && lastProfileKey === profileKey;

        if (cacheIsFresh || (loading && lastProfileKey === profileKey)) return;

        const requestId = ++activeFamiliesRequest;
        set({ loading: true, lastProfileKey: profileKey, error: null });
        try {
            const families = await getFamiliesByRole(profile);
            if (requestId !== activeFamiliesRequest) return;
            set({
                families,
                lastFetchedAt: Date.now(),
                loading: false,
                isInitialized: true,
            });
        } catch (error) {
            if (requestId !== activeFamiliesRequest) return;
            set({ loading: false, error: getErrorMessage(error, 'Gagal mengambil data keluarga') });
        }
    },

    invalidate: () => {
        activeFamiliesRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));
