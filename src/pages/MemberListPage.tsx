import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import MemberList from '../components/MemberList';
import { setMembersStore, type Member } from '../types/Member';

export default function MembersListPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'sensus'), orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ uuid: doc.id, ...doc.data() }));

            setMembers(data as any as Member[]);
            setMembersStore(data as any as Member[]);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
