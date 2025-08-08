import { useEffect } from 'react'
import { supabase } from '../supabase/client'
import MemberCreate from '../components/MemberCreate'
// import type { Member } from '../types/Member'

export default function MembersCreatePage() {
    useEffect(() => {
        const fetchMembers = async () => {
            const { data, error } = await supabase.from('anggota').select('*')
            if (!error && data) {
            }
        }

        fetchMembers()
    }, [])

    return <MemberCreate />
}
