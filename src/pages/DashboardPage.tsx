import { useEffect, useState } from 'react'
import Dashboard from '../components/Dashboard'
import { useAuth } from '../contexts/AuthContext';
import { useRoleMembersStore } from '../store/membersStore';
import { useFamiliesStore } from '../store/familiesStore';

export default function DashboardPage() {
    const [selectedKelompok, setSelectedKelompok] = useState<string>('');
    const { profile } = useAuth();

    // Ambil members dari store (role-based, ter-cache)
    const { members, loading: isMembersLoading, isInitialized: memberReady, fetchByRole } = useRoleMembersStore();
    // Ambil families dari store (role-based, ter-cache)
    const { families: listFamily, loading: isFamilyLoading, isInitialized: familyReady, fetchFamilies } = useFamiliesStore();

    useEffect(() => {
        if (profile) {
            fetchByRole(profile);
            fetchFamilies(profile);
        }
    }, [profile, fetchByRole, fetchFamilies]);

    // Skeleton hanya muncul saat belum ada data sama sekali (first load)
    const isFirstLoad = (!memberReady && isMembersLoading) || (!familyReady && isFamilyLoading);

    return (
        <Dashboard
            loading={isFirstLoad}
            members={members}
            listFamily={listFamily}
            selectedKelompok={selectedKelompok}
            setSelectedKelompok={setSelectedKelompok}
            profileStatus={profile?.status}
        />
    );
}
