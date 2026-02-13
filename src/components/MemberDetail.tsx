import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase } from '../supabase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
// 1. Import Toast
import toast, { Toaster } from 'react-hot-toast';
import { 
    ArrowLeft, 
    Edit, 
    Trash2, 
    Lock, 
    Loader2, 
    User, 
    Calendar, 
    Users, 
    GraduationCap, 
    Heart, 
    Activity, 
    HandHeart, 
    BookOpen, 
    Hash,
    Tag,
    AlertTriangle,
} from 'lucide-react';
// import useNotifications from '../hooks/useNotifications/useNotifications'; // Hapus ini
import { type Member } from '../types/Member';

dayjs.locale('id');

const AUTH_KEY = 'member_create_session';
const SESSION_DURATION = 30 * 60 * 1000;

// --- Helper Component: Detail Item ---
const DetailItem = ({ icon: Icon, label, value, subValue }: { icon: any, label: string, value: React.ReactNode, subValue?: string }) => (
    <div className="flex items-start gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-indigo-100 transition-colors">
        <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 shadow-sm">
            <Icon size={20} />
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <div className="font-semibold text-slate-800 text-lg leading-tight">{value || '-'}</div>
            {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
        </div>
    </div>
);

// --- Helper Component: Badge ---
const StatusBadge = ({ active, activeText, inactiveText, color }: any) => {
    const bg = active 
        ? (color === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200')
        : 'bg-slate-100 text-slate-500 border-slate-200';
    
    return (
        <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${bg}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${active ? (color === 'green' ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-slate-400'}`}></div>
            {active ? activeText : inactiveText}
        </div>
    );
};

export default function MemberShow() {
    const { id } = useParams();
    const navigate = useNavigate();
    // const notifications = useNotifications(); // Hapus ini

    // --- State ---
    const [member, setMember] = useState<Member | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Auth & Actions
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored && Date.now() - parseInt(stored, 10) < SESSION_DURATION) return true;
        return false;
    });
    
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | null>(null);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

    // --- Fetch Data ---
    const fetchMember = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('list_sensus')
                .select('*')
                .eq('uuid', id)
                .single();

            if (error) throw error;
            setMember(data);
        } catch (err: any) {
            // 2. Ganti error fetch
            toast.error(`Gagal memuat data: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchMember();
    }, [fetchMember]);

    // --- Handlers ---

    const handleAction = (action: 'edit' | 'delete') => {
        if (isAuthenticated) {
            localStorage.setItem(AUTH_KEY, Date.now().toString()); 
            executeAction(action);
        } else {
            setPendingAction(action);
            setOpenPasswordDialog(true);
        }
    };

    const executeAction = (action: 'edit' | 'delete') => {
        if (action === 'edit') {
            navigate(`/members/${id}/edit`);
        } else if (action === 'delete') {
            setOpenDeleteConfirm(true);
        }
    };

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput.trim()) {
            toast('Password kosong', { icon: '⚠️' });
            return;
        }

        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === "admin354") { 
                localStorage.setItem(AUTH_KEY, Date.now().toString());
                setIsAuthenticated(true);
                setOpenPasswordDialog(false);
                if (pendingAction) executeAction(pendingAction);
                // 3. Ganti sukses login
                toast.success('Akses diberikan');
            } else {
                // 4. Ganti error login
                toast.error('Password salah');
            }
            setLoadingPassword(false);
            setPasswordInput('');
        }, 800);
    };

    const confirmDelete = async () => {
        if (!member) return;
        
        // 5. Tambahkan loading UX saat hapus
        const toastId = toast.loading('Menghapus data...');
        setIsLoading(true);

        try {
            const { error } = await supabase.from('list_sensus').delete().eq('uuid', member.uuid);
            if (error) throw error;
            
            // 6. Sukses hapus (update toast loading jadi sukses)
            toast.success('Data berhasil dihapus', { id: toastId });
            navigate('/members');
        } catch (err: any) {
            // 7. Error hapus
            toast.error(err.message, { id: toastId });
            setIsLoading(false);
        }
    };

    const handleLockSession = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
        // 8. Info Lock
        toast('Sesi dikunci', { icon: '🔒' });
    };

    // --- Render Loading ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-slate-500 font-medium">Memuat data anggota...</p>
            </div>
        );
    }

    if (!member) return null;

    const pageTitle = member.family_name === 'Rantau' 
        ? 'Anggota Perantauan' 
        : `Keluarga ${member.family_name}`;

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
            {/* 9. Pasang Toaster */}
            <Toaster position="top-center" />

            {/* Header Navigation */}
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/members')} 
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{member.name}</h1>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            {pageTitle}
                            {member.alias && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100">Alias: {member.alias}</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isAuthenticated && (
                        <button onClick={handleLockSession} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-colors" title="Kunci Sesi">
                            <Lock size={18} />
                        </button>
                    )}
                    <button 
                        onClick={() => handleAction('edit')} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm"
                    >
                        <Edit size={18} /> <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button 
                        onClick={() => handleAction('delete')} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-medium rounded-xl hover:bg-rose-100 transition-all shadow-sm"
                    >
                        <Trash2 size={18} /> <span className="hidden sm:inline">Hapus</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Main Identity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <User size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Informasi Personal</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DetailItem 
                                icon={User} 
                                label="Nama Lengkap" 
                                value={member.name} 
                                subValue={member.alias ? `Panggilan: ${member.alias}` : undefined}
                            />
                            <DetailItem 
                                icon={Hash} 
                                label="Jenis Kelamin" 
                                value={member.gender} 
                            />
                            <DetailItem 
                                icon={Calendar} 
                                label="Tanggal Lahir" 
                                value={member.date_of_birth ? dayjs(member.date_of_birth).format('DD MMMM YYYY') : '-'}
                                subValue={`${member.age} Tahun`}
                            />
                            <DetailItem 
                                icon={Heart} 
                                label="Status Pernikahan" 
                                value={member.marriage_status} 
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <GraduationCap size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Sosial & Keluarga</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DetailItem 
                                icon={Users} 
                                label="Keluarga" 
                                value={member.family_name} 
                            />
                            <DetailItem 
                                icon={Tag} 
                                label="Urutan di KK" 
                                value={member.order ? `Urutan ke-${member.order}` : '-'} 
                            />
                            <DetailItem 
                                icon={BookOpen} 
                                label="Jenjang Pembinaan" 
                                value={member.level} 
                            />
                            <DetailItem 
                                icon={Users} 
                                label="Kelompok" 
                                value={member.kelompok || '-'} 
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Status Cards */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-full">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Status Keanggotaan</h3>
                        
                        <div className="space-y-4">
                            {/* Is Active */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${member.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Sambung Aktif</p>
                                        <p className="text-xs text-slate-500">Status kehadiran</p>
                                    </div>
                                </div>
                                <StatusBadge active={member.is_active} activeText="Aktif" inactiveText="Non-Aktif" color="green" />
                            </div>

                            {/* Is Binaan */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${member.is_educate ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Dalam Binaan</p>
                                        <p className="text-xs text-slate-500">Status pendidikan</p>
                                    </div>
                                </div>
                                <StatusBadge active={member.is_educate} activeText="Ya" inactiveText="Tidak" color="blue" />
                            </div>

                            {/* Is Duafa */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${member.is_duafa ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <HandHeart size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Kategori Duafa</p>
                                        <p className="text-xs text-slate-500">Penerima bantuan</p>
                                    </div>
                                </div>
                                <StatusBadge active={member.is_duafa} activeText="Ya" inactiveText="Tidak" color="green" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Password Modal */}
            {openPasswordDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Verifikasi Diperlukan</h3>
                        <p className="text-sm text-slate-500 mb-6">Masukkan password admin untuk {pendingAction === 'edit' ? 'mengubah' : 'menghapus'} data ini.</p>
                        <input 
                            type="password" 
                            autoFocus
                            placeholder="Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none mb-6"
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setOpenPasswordDialog(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                            <button type="submit" disabled={loadingPassword} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">{loadingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Lanjut'}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {openDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center gap-3 text-rose-600 mb-4">
                            <div className="p-3 bg-rose-100 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Hapus Data?</h3>
                        </div>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Apakah Anda yakin ingin menghapus data <strong>{member.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setOpenDeleteConfirm(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">Hapus Permanen</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}