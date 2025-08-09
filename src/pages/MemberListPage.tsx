import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import MemberList from '../components/MemberList'
import { setMembersStore, type Member } from '../types/Member'

export default function MembersListPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const fetchMembers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase.from('list_sensus').select('*')
            .order('name', { ascending: true });

        if (!error && data) {
            setMembers(data)
            setMembersStore(data)
            setIsLoading(false)
        }
    }
    useEffect(() => {
        fetchMembers()
    }, [])

    return <MemberList loading={isLoading} members={members} refreshMembers={fetchMembers} />
}

