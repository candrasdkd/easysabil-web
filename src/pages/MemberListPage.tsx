import { useCallback, useEffect } from 'react';
import MemberList from '../components/MemberList';
import { setMembersStore } from '../types/Member';
import { useAuth } from '../contexts/AuthContext';
import { useRoleMembersStore } from '../store/membersStore';

export default function MembersListPage() {
    const { profile } = useAuth();

    // Ambil members dari store (role-based, ter-cache)
    const { members, loading: isLoading, isInitialized, fetchByRole, invalidate } = useRoleMembersStore();

    useEffect(() => {
        if (profile) fetchByRole(profile);
    }, [profile, fetchByRole]);

    // Sync ke localStorage store (agar kompatibel dengan kode lain yang masih pakai getMembersStore)
    useEffect(() => {
        if (members.length > 0) setMembersStore(members);
    }, [members]);

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
