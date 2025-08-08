interface DashboardProps {
    total: number
}

export default function Dashboard({ total }: DashboardProps) {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Dashboard</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-md p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-700">Total Anggota</h3>
                    <p className="text-4xl font-bold text-blue-600 mt-2">{total}</p>
                </div>

                {/* Tambahkan kartu lainnya nanti */}
            </div>
        </div>
    )
}
