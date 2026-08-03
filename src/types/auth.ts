import type { User } from 'firebase/auth';

export interface UserProfile {
    uid: string;
    email: string;
    status: number;
    kelompok: string;
    isActive: boolean;
    createdAt?: unknown;
}

export interface AuthContextValue {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

export const STATUS_LABELS: Readonly<Record<number, string>> = {
    0: 'Super Admin',
    1: 'Admin',
    2: 'Pengurus Desa',
    3: 'Pengurus Kelompok',
    4: 'Pengurus Muda/i Desa',
    5: 'Pengurus Muda/i Kelompok',
};

export function isKnownUserStatus(status: number): boolean {
    return Number.isInteger(status) && status >= 0 && status <= 5;
}
