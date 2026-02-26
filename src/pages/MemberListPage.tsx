import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import MemberList from '../components/MemberList';
import { setMembersStore, type Member } from '../types/Member';
import { useAuth } from '../contexts/AuthContext';

const MUDA_LEVELS = ['Pra Nikah', 'Pra Remaja', 'Remaja'];

export default function MembersListPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profile } = useAuth();

    const fetchMembers = useCallback(async () => {
        if (!profile) return;
        setIsLoading(true);
        try {
            const status = profile.status;
            const kelompok = profile.kelompok;

            let allMembers: Member[] = [];

            if (status === 0 || status === 1 || status === 2) {
                // Super Admin, Admin, Pengurus Desa → semua member
                const q = query(collection(db, 'sensus'), orderBy('name', 'asc'));
                const snap = await getDocs(q);
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];

            } else if (status === 3) {
                // Pengurus Kelompok → filter kelompok
                const q = query(
                    collection(db, 'sensus'),
                    where('kelompok', '==', kelompok),
                    orderBy('name', 'asc')
                );
                const snap = await getDocs(q);
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];

            } else if (status === 4) {
                // Pengurus Muda/i Desa → semua kelompok, filter level
                const q = query(collection(db, 'sensus'), orderBy('name', 'asc'));
                const snap = await getDocs(q);
                const all = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];
                allMembers = all.filter(m => MUDA_LEVELS.includes(m.level));

            } else if (status === 5) {
                // Pengurus Muda/i Kelompok → filter kelompok + level
                const q = query(
                    collection(db, 'sensus'),
                    where('kelompok', '==', kelompok),
                    orderBy('name', 'asc')
                );
                const snap = await getDocs(q);
                const byKelompok = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];
                allMembers = byKelompok.filter(m => MUDA_LEVELS.includes(m.level));
            }

            setMembers(allMembers);
            setMembersStore(allMembers);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        void fetchMembers();
    }, [fetchMembers]);

    return (
        <MemberList
            loading={isLoading}
            members={members}
            refreshMembers={fetchMembers}
        />
    );
}
