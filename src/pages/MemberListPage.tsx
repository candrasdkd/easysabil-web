import { useCallback, useEffect } from 'react';
import MemberList from '../components/MemberList';
import { useAuth } from '../contexts/auth';
import { useRoleMembersStore } from '../store/membersStore';

export default function MembersListPage() {
    const { profile } = useAuth();

    // Ambil members dari store (role-based, ter-cache)
    const { members, loading: isLoading, isInitialized, fetchByRole, invalidate } = useRoleMembersStore();

    useEffect(() => {
        if (profile) fetchByRole(profile);
    }, [profile, fetchByRole]);

    // Re-fetch ketika cache di-invalidate (misal setelah edit/create/delete)
    // isInitialized akan jadi false setelah invalidate() dipanggil
    useEffect(() => {
        if (profile && !isInitialized && !isLoading) {
            fetchByRole(profile);
        }
    }, [isInitialized, profile, isLoading, fetchByRole]);

    // refreshMembers: invalidate cache lalu fetch ulang
    const refreshMembers = useCallback(async () => {
        if (!profile) return;
        invalidate();
        await fetchByRole(profile);
    }, [profile, invalidate, fetchByRole]);

    return (
        <MemberList
            loading={!isInitialized && isLoading}
            members={members}
            refreshMembers={refreshMembers}
        />
    );
}
