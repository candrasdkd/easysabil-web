import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import Dashboard from '../components/Dashboard'
import { setMembersStore, type Familys, type Member } from '../types/Member'

export default function DashboardPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [listFamily, setListFamily] = useState<Familys[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const fetchMembers = async () => {
        try {
            const q = query(collection(db, 'sensus'), where('is_active', '==', true));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ uuid: doc.id, ...doc.data() }));
            setMembers(data as any as Member[]);
            setMembersStore(data as any as Member[]);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching members:", error);
            setIsLoading(false);
        }
    }

    const fetchFamilys = async () => {
        try {
            const q = query(collection(db, 'families'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setListFamily(data as any as Familys[]);
        } catch (error) {
            console.error("Error fetching families:", error);
        }
    }
    useEffect(() => {
        fetchMembers();
        fetchFamilys();
    }, [])

    return <Dashboard loading={isLoading} members={members} listFamily={listFamily} />
}
