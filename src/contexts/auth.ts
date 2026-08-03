import { createContext, useContext } from 'react';
import type { AuthContextValue, UserProfile } from '../types/auth';

export { STATUS_LABELS } from '../types/auth';
export type { UserProfile };

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth harus digunakan di dalam AuthProvider');
    }
    return context;
}
