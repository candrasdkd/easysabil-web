import { create } from 'zustand';
import { CACHE_TTL, isCacheFresh } from '../lib/cache';
import { getErrorMessage } from '../lib/errors';
import {
    getActiveMembers,
    getMembersByRole,
    type RoleProfile,
} from '../repositories/membersRepository';
import type { Member } from '../types/Member';

interface FetchState {
    loading: boolean;
    isInitialized: boolean;
    lastFetchedAt: number | null;
    error: string | null;
}

interface AllMembersState extends FetchState {
    members: Member[];
    fetchMembers: () => Promise<void>;
    invalidate: () => void;
}

let activeMembersRequest = 0;

export const useMembersStore = create<AllMembersState>((set, get) => ({
    members: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    error: null,

    fetchMembers: async () => {
        const { loading, lastFetchedAt } = get();
        if (loading || isCacheFresh(lastFetchedAt, CACHE_TTL.short)) return;

        const requestId = ++activeMembersRequest;
        set({ loading: true, error: null });
        try {
            const members = await getActiveMembers();
            if (requestId !== activeMembersRequest) return;
            set({
                members,
                lastFetchedAt: Date.now(),
                loading: false,
                isInitialized: true,
            });
        } catch (error) {
            if (requestId !== activeMembersRequest) return;
            set({ loading: false, error: getErrorMessage(error, 'Gagal mengambil data anggota') });
        }
    },

    invalidate: () => {
        activeMembersRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));

interface RoleMembersState extends FetchState {
    members: Member[];
    lastProfileKey: string | null;
    fetchByRole: (profile: RoleProfile) => Promise<void>;
    invalidate: () => void;
}

let activeRoleMembersRequest = 0;

export const useRoleMembersStore = create<RoleMembersState>((set, get) => ({
    members: [],
    loading: false,
    isInitialized: false,
    lastFetchedAt: null,
    lastProfileKey: null,
    error: null,

    fetchByRole: async (profile) => {
        const profileKey = `${profile.status}:${profile.kelompok ?? ''}`;
        const { loading, lastFetchedAt, lastProfileKey } = get();
        const cacheIsFresh = isCacheFresh(lastFetchedAt, CACHE_TTL.short)
            && lastProfileKey === profileKey;

        if (cacheIsFresh || (loading && lastProfileKey === profileKey)) return;

        const requestId = ++activeRoleMembersRequest;
        set({ loading: true, lastProfileKey: profileKey, error: null });
        try {
            const members = await getMembersByRole(profile);
            if (requestId !== activeRoleMembersRequest) return;
            set({
                members,
                lastFetchedAt: Date.now(),
                loading: false,
                isInitialized: true,
            });
        } catch (error) {
            if (requestId !== activeRoleMembersRequest) return;
            set({ loading: false, error: getErrorMessage(error, 'Gagal mengambil data anggota') });
        }
    },

    invalidate: () => {
        activeRoleMembersRequest += 1;
        set({ lastFetchedAt: null, isInitialized: false, loading: false });
    },
}));
