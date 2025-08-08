import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import Dashboard from '../components/Dashboard'

export default function DashboardPage() {
    const [total, setTotal] = useState<number>(0)

    useEffect(() => {
        const fetchTotal = async () => {
            const { count, error } = await supabase
                .from('anggota')
                .select('*', { count: 'exact', head: true })

            if (!error && count !== null) {
                setTotal(count)
            }
        }

        fetchTotal()
    }, [])

    return <Dashboard total={total} />
}
