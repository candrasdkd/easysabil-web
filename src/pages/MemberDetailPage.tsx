import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import MemberDetail from '../components/MemberDetail'
// import type { Member } from '../types/Member'

export default function MembersDetailPage() {
    useEffect(() => {
        const fetchMembers = async () => {
            const { data, error } = await supabase.from('anggota').select('*')
            if (!error && data) {
            }
        }

        fetchMembers()
    }, [])

    return <MemberDetail />
}
