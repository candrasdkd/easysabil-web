import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/client';
import MemberList from '../components/MemberList';
import { setMembersStore, type Member } from '../types/Member';

export default function MembersListPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('list_sensus')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            // opsional: bisa tampilkan notifikasi di sini
            setIsLoading(false);
            return;
        }

        if (data) {
            setMembers(data as Member[]);
            setMembersStore(data as Member[]);
        }
        setIsLoading(false);
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
