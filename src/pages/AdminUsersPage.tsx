import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as adminSignOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase/client';
import toast from 'react-hot-toast';
import { type UserProfile } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

export const STATUS_LABELS: Record<number, string> = {
    0: 'Super Admin',
    1: 'Admin',
    2: 'Pengurus Desa',
    3: 'Pengurus Kelompok',
    4: 'Pengurus Muda/i Desa',
    5: 'Pengurus Muda/i Kelompok'
};

// Initialize a secondary auth instance for creating users without logging out the super admin
const adminApp = initializeApp(firebaseConfig, 'AdminApp');
const adminAuth = getAuth(adminApp);

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [togglingUids, setTogglingUids] = useState<Set<string>>(new Set());
    const { profile: currentUserProfile, user: currentUser } = useAuth();

    const isSuperAdmin = currentUserProfile?.status === 0;

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [kelompok, setKelompok] = useState('');
    const [status, setStatus] = useState<number>(5); // Default PM Kelompok
    const [isCreating, setIsCreating] = useState(false);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers: UserProfile[] = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data() as UserProfile;
                // Never show own account in the list
                if (data.uid !== currentUser?.uid) {
                    if (isSuperAdmin) {
                        fetchedUsers.push(data);
                    } else {
                        // Regular Admin: Exclude Super Admin and only match kelompok
                        if (data.status !== 0 && data.kelompok === currentUserProfile?.kelompok) {
                            fetchedUsers.push(data);
                        }
                    }
                }
            });
            // Sort by status ascending
            fetchedUsers.sort((a, b) => a.status - b.status);
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Gagal mengambil data pengguna");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.uid && currentUserProfile) {
            fetchUsers();
        }
    }, [currentUser, currentUserProfile]);

    const handleToggleActive = async (uid: string, currentStatus: boolean) => {
        setTogglingUids(prev => new Set(prev).add(uid));
        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                isActive: !currentStatus
            });
            toast.success(`Akun berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
            setUsers(prevUsers => prevUsers.map(user =>
                user.uid === uid ? { ...user, isActive: !currentStatus } : user
            ));
        } catch (error) {
            console.error("Error updating user active status:", error);
            toast.error("Gagal mengubah status pengguna");
        } finally {
            setTogglingUids(prev => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

    const handleChangeStatus = async (uid: string, newStatus: number) => {
        if (!isSuperAdmin) return;

        try {
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                status: newStatus
            });
            toast.success(`Status pengurus berhasil diubah`);
            setUsers(prevUsers => prevUsers.map(user =>
                user.uid === uid ? { ...user, status: newStatus } : user
            ).sort((a, b) => a.status - b.status));
        } catch (error) {
            console.error("Error updating user status:", error);
            toast.error("Gagal mengubah status pengguna");
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !kelompok) {
            toast.error("Mohon lengkapi semua data!");
            return;
        }

        setIsCreating(true);
        try {
            // Create user in secondary Auth app
            const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
            const newUser = userCredential.user;

            // Immediately sign out from the secondary app
            await adminSignOut(adminAuth);

            // Create user document in Firestore with active status already true since Admin created it
            const newUserProfile: UserProfile = {
                uid: newUser.uid,
                email: email,
                status: status,
                kelompok: kelompok,
                isActive: true,
                createdAt: new Date()
            };

            await setDoc(doc(db, 'users', newUser.uid), newUserProfile);

            toast.success("Pengguna berhasil dibuat!");
            setUsers(prev => {
                const updated = [...prev, newUserProfile];
                return updated.sort((a, b) => a.status - b.status);
            });

            // Reset modal
            setShowModal(false);
            setEmail('');
            setPassword('');
            setKelompok('');
            setStatus(5);
        } catch (error: any) {
            console.error("Create User Error:", error);
            const message = error.message || 'Gagal membuat pengguna';
            toast.error(message);
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading data pengguna...</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
                {isSuperAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
                    >
                        + Buat Akun Baru
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Pengurus</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kelompok</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.uid}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {isSuperAdmin ? (
                                        <select
                                            value={user.status}
                                            onChange={(e) => handleChangeStatus(user.uid, Number(e.target.value))}
                                            className="mt-1 block w-full pl-3 pr-8 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                                        >
                                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                <option key={val} value={Number(val)}>{label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 1 ? 'bg-blue-100 text-blue-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {STATUS_LABELS[user.status] || 'Unknown'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.kelompok}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.isActive ? 'Aktif' : 'Menunggu'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleToggleActive(user.uid, user.isActive)}
                                        disabled={togglingUids.has(user.uid)}
                                        className={`px-3 py-1.5 rounded-md text-white text-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed transition-all ${user.isActive
                                            ? 'bg-red-500 hover:bg-red-600'
                                            : 'bg-green-500 hover:bg-green-600'
                                            }`}
                                    >
                                        {togglingUids.has(user.uid) ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : null}
                                        {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal (Only for Super Admin) */}
            {isSuperAdmin && showModal && (
                <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => !isCreating && setShowModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Buat Akun Pengguna</h3>
                                <form className="space-y-4" onSubmit={handleCreateUser}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status Pengurus</label>
                                        <select
                                            required
                                            value={status}
                                            onChange={(e) => setStatus(Number(e.target.value))}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                                        >
                                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                                <option key={val} value={Number(val)}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Kelompok</label>
                                        <select
                                            required
                                            value={kelompok}
                                            onChange={(e) => setKelompok(e.target.value)}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
                                        >
                                            <option value="" disabled>Pilih Kelompok</option>
                                            <option value="Kelompok 1">Kelompok 1</option>
                                            <option value="Kelompok 2">Kelompok 2</option>
                                            <option value="Kelompok 3">Kelompok 3</option>
                                            <option value="Kelompok 4">Kelompok 4</option>
                                            <option value="Kelompok 5">Kelompok 5</option>
                                        </select>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse -mx-6 -mb-4 mt-6">
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                        >
                                            {isCreating ? 'Membuat...' : 'Buat Akun'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            disabled={isCreating}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
