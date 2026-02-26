import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import toast from 'react-hot-toast';
import { type UserProfile } from '../contexts/AuthContext';
import { useAuth, STATUS_LABELS } from '../contexts/AuthContext';
import { ChevronDown } from 'lucide-react';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingUids, setTogglingUids] = useState<Set<string>>(new Set());
    const { profile: currentUserProfile, user: currentUser } = useAuth();

    const isSuperAdmin = currentUserProfile?.status === 0;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers: UserProfile[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data() as UserProfile;
                if (data.uid === currentUser?.uid) return;
                if (isSuperAdmin) {
                    fetchedUsers.push(data);
                } else {
                    if (data.status !== 0 && data.kelompok === currentUserProfile?.kelompok) {
                        fetchedUsers.push(data);
                    }
                }
            });
            fetchedUsers.sort((a, b) => a.status - b.status);
            setUsers(fetchedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Gagal mengambil data pengguna');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.uid) {
            fetchUsers();
        }
    }, [currentUser?.uid, currentUserProfile?.status]);

    const handleToggleActive = async (uid: string, currentIsActive: boolean) => {
        setTogglingUids(prev => new Set(prev).add(uid));
        try {
            await updateDoc(doc(db, 'users', uid), { isActive: !currentIsActive });
            toast.success(`Akun berhasil ${!currentIsActive ? 'diaktifkan' : 'dinonaktifkan'}`);
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive: !currentIsActive } : u));
        } catch {
            toast.error('Gagal mengubah status aktif pengguna');
        } finally {
            setTogglingUids(prev => { const n = new Set(prev); n.delete(uid); return n; });
        }
    };

    const handleChangeStatus = async (uid: string, newStatus: number) => {
        if (!isSuperAdmin) return;
        try {
            await updateDoc(doc(db, 'users', uid), { status: newStatus });
            toast.success('Status pengurus berhasil diubah');
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus } : u).sort((a, b) => a.status - b.status));
        } catch {
            toast.error('Gagal mengubah status pengurus');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Memuat data pengguna...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Manajemen Pengguna</h2>
                        <p className="text-sm text-slate-400 mt-0.5">{users.length} pengguna terdaftar</p>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelompok</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                                        Belum ada pengguna
                                    </td>
                                </tr>
                            ) : users.map((u) => (
                                <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-800">{u.email}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {isSuperAdmin ? (
                                            <div className="relative">
                                                <select
                                                    value={u.status}
                                                    onChange={(e) => handleChangeStatus(u.uid, Number(e.target.value))}
                                                    className="appearance-none pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                        <option key={val} value={Number(val)}>{label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg">
                                                {STATUS_LABELS[u.status] ?? 'Unknown'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{u.kelompok}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {u.isActive ? 'Aktif' : 'Menunggu'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleToggleActive(u.uid, u.isActive)}
                                            disabled={togglingUids.has(u.uid)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${u.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                        >
                                            {togglingUids.has(u.uid) && (
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            )}
                                            {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
