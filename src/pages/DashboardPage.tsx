import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import Dashboard from '../components/Dashboard'
import { setMembersStore, type Familys, type Member } from '../types/Member'

export default function DashboardPage() {
    const [members, setMembers] = useState<Member[]>([])
    const [listFamily, setListFamily] = useState<Familys[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const fetchMembers = async () => {
        const { data, error } = await supabase.from('list_sensus').select('*')
        if (!error && data) {
            setMembers(data)
            setMembersStore(data)
            setIsLoading(false)
        }
    }

    const fetchFamilys = async () => {
        const { data, error } = await supabase.from('list_family').select('id, name')
            .order('name', { ascending: true });
        if (!error && data) {
            setListFamily(data)
            // setMembersStore(data)
            // setIsLoading(false)
        }
    }
    useEffect(() => {
        fetchMembers();
        fetchFamilys();
    }, [])

    return <Dashboard members={members} listFamily={listFamily} />
}
