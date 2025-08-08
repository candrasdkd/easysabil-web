import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import MemberEdit from '../components/MemberEdit'
// import type { Member } from '../types/Member'

export default function MembersEditPage() {
    useEffect(() => {
        const fetchMembers = async () => {
            const { data, error } = await supabase.from('anggota').select('*')
            if (!error && data) {
            }
        }

        fetchMembers()
    }, [])

    return <MemberEdit />
}
