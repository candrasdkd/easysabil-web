import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import Dashboard from '../components/Dashboard'
import { setMembersStore, type Familys, type Member } from '../types/Member'
import { useAuth } from '../contexts/AuthContext';

// Levels that Pengurus Muda/i (status 4 & 5) can see
const MUDA_LEVELS = ['Pra Nikah', 'Pra Remaja', 'Remaja'];

export default function DashboardPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [listFamily, setListFamily] = useState<Familys[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { profile } = useAuth();

    const fetchMembers = async () => {
        if (!profile) return;

        try {
            const status = profile.status;
            const kelompok = profile.kelompok;

            let allMembers: Member[] = [];

            if (status === 0 || status === 1 || status === 2) {
                // Super Admin, Admin, Pengurus Desa → semua member aktif tanpa filter
                const q = query(collection(db, 'sensus'), where('is_active', '==', true));
                const snap = await getDocs(q);
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];

            } else if (status === 3) {
                // Pengurus Kelompok → filter kelompok sesuai login
                const q = query(
                    collection(db, 'sensus'),
                    where('is_active', '==', true),
                    where('kelompok', '==', kelompok)
                );
                const snap = await getDocs(q);
                allMembers = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];

            } else if (status === 4) {
                // Pengurus Muda/i Desa → filter level saja, semua kelompok
                const q = query(collection(db, 'sensus'), where('is_active', '==', true));
                const snap = await getDocs(q);
                const all = snap.docs.map(doc => ({ uuid: doc.id, ...doc.data() })) as any as Member[];
                allMembers = all.filter(m => MUDA_LEVELS.includes(m.level));

            } else if (status === 5) {
                // Pengurus Muda/i Kelompok → filter kelompok + level
                const q = query(
                    collection(db, 'sensus'),
                    where('is_active', '==', true),
                    where('kelompok', '==', kelompok)
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
    }

    const fetchFamilys = async () => {
        if (!profile) return;
        try {
            const status = profile.status;
            const kelompok = profile.kelompok;

            let q;
            if (status === 3 || status === 5) {
                // Pengurus Kelompok & PM Kelompok → hanya keluarga dari kelompok sendiri
                q = query(
                    collection(db, 'families'),
                    where('kelompok', '==', kelompok),
                    orderBy('name', 'asc')
                );
            } else {
                // Status 0, 1, 2, 4 → semua keluarga
                q = query(collection(db, 'families'), orderBy('name', 'asc'));
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setListFamily(data as any as Familys[]);
        } catch (error) {
            console.error("Error fetching families:", error);
        }
    }

    useEffect(() => {
        if (profile) {
            fetchMembers();
            fetchFamilys();
        }
    }, [profile])

    return <Dashboard loading={isLoading} members={members} listFamily={listFamily} />
}
