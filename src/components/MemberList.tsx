import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../supabase/client';
// 1. Import Toast
import toast, { Toaster } from 'react-hot-toast';
import { 
    Search, 
    Plus, 
    RefreshCw, 
    Filter, 
    Download, 
    Edit, 
    Trash2, 
    Lock, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X,
    Loader2
} from 'lucide-react';

import { type Member } from '../types/Member';

dayjs.locale('id');

const INITIAL_PAGE_SIZE = 15;

type Props = {
    loading?: boolean;
    members: Member[];
    refreshMembers: () => void;
};

// --- Helper Components ---

const Badge = ({ children, color }: { children: React.ReactNode, color: 'green' | 'red' | 'gray' | 'blue' }) => {
    const colors = {
        green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        red: 'bg-rose-100 text-rose-700 border-rose-200',
        gray: 'bg-slate-100 text-slate-600 border-slate-200',
        blue: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[color]}`}>
            {children}
        </span>
    );
};

export default function MemberList({ loading, members, refreshMembers }: Props) {
    const navigate = useNavigate();

    // --- State ---
    const [searchText, setSearchText] = useState('');
    
    // Filters
    const [selectedGender, setSelectedGender] = useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string[]>([]);
    const [selectedMarriageStatus, setSelectedMarriageStatus] = useState<string[]>([]);
    const [memberStatus, setMemberStatus] = useState<'Aktif' | 'Tidak Aktif' | 'Semua'>('Aktif');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Password & Actions
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [requiredPassword, setRequiredPassword] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Pagination & Sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Member | 'actions'; direction: 'asc' | 'desc' }>({ key: 'order', direction: 'asc' });

    // --- Logic ---

    // 1. Highlight Text Logic
    const highlightMatch = (text: string | number | null, search: string) => {
        const source = String(text ?? '');
        if (!search) return source;
        const regex = new RegExp(`(${search})`, 'gi');
        const parts = source.split(regex);
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                        <span key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </>
        );
    };

    // 2. Filter & Sort Logic (Memoized)
    const processedMembers = useMemo(() => {
        let filtered = members.filter(m => !m.is_educate); // Default filter (bisa disesuaikan)

        // Status Filter
        if (memberStatus === 'Aktif') filtered = filtered.filter(m => m.is_active);
        if (memberStatus === 'Tidak Aktif') filtered = filtered.filter(m => !m.is_active);

        // Multi Select Filters
        if (selectedGender.length) filtered = filtered.filter(m => selectedGender.includes(m.gender));
        if (selectedLevel.length) filtered = filtered.filter(m => selectedLevel.includes(m.level));
        if (selectedMarriageStatus.length) filtered = filtered.filter(m => selectedMarriageStatus.includes(m.marriage_status));

        // Search Text (Updated to include Alias)
        if (searchText.trim()) {
            const q = searchText.toLowerCase();
            filtered = filtered.filter(m => 
                Object.entries(m).some(([key, value]) => {
                    if (value == null || key === 'family_name' || key === 'uuid' || key === 'id_family') return false;
                    let str = String(value);
                    if (key === 'date_of_birth') str = dayjs(value as string).format('DD MMMM YYYY');
                    return str.toLowerCase().includes(q);
                })
            );
        }

        // Sorting
        filtered.sort((a, b) => {
            let aVal: any = a[sortConfig.key as keyof Member];
            let bVal: any = b[sortConfig.key as keyof Member];

            if (sortConfig.key === 'name') {
                aVal = a.alias || a.name;
                bVal = b.alias || b.name;
            }

            if (aVal == null) return 1;
            if (bVal == null) return -1;

            let comparison = 0;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [members, searchText, memberStatus, selectedGender, selectedLevel, selectedMarriageStatus, sortConfig]);

    // 3. Pagination Logic
    const paginatedMembers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return processedMembers.slice(start, start + pageSize);
    }, [processedMembers, currentPage, pageSize]);

    const totalPages = Math.ceil(processedMembers.length / pageSize);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, memberStatus, selectedGender, selectedLevel, selectedMarriageStatus]);


    // --- Handlers ---

    const handleSort = (key: keyof Member) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const verifyPasswordAndRun = (expected: string, action: () => void) => {
        setRequiredPassword(expected);
        setPendingAction(() => action);
        setPasswordInput('');
        setOpenPasswordDialog(true);
    };

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        if (!passwordInput.trim()) {
            toast('Password kosong', { icon: '⚠️' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === requiredPassword) {
                setOpenPasswordDialog(false);
                toast.success('Verifikasi berhasil');
                pendingAction?.();
            } else {
                toast.error('Password salah');
            }
            setLoadingPassword(false);
        }, 800);
    };

    const handleDelete = (member: Member) => {
        // Menggunakan Password sebagai konfirmasi (Super Admin)
        verifyPasswordAndRun('superadmin354', async () => {
            const toastId = toast.loading('Menghapus data...');
            
            try {
                const { error } = await supabase.from('list_sensus').delete().eq('uuid', member.uuid);
                if (error) throw error;

                toast.success('Data berhasil dihapus', { id: toastId });
                refreshMembers();
            } catch (err: any) {
                toast.error(`Gagal: ${err.message}`, { id: toastId });
            }
        });
    };

    const handleExportExcel = () => {
        const data = processedMembers.map(row => ({
            'Nama/Alias': row.alias || row.name, 
            'Nama Asli': row.name,
            'Status': row.is_active ? 'Aktif' : 'Non-Aktif',
            'Jenjang': row.level,
            'Gender': row.gender,
            'Umur': row.age,
            'Tgl Lahir': row.date_of_birth ? dayjs(row.date_of_birth).format('DD MMM YYYY') : '-',
            'Status Nikah': row.marriage_status,
            'Keluarga': row.family_name,
            'Urutan': row.order
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Member');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'Data_Jamaah.xlsx');
        toast.success('File Excel berhasil diunduh');
    };

    // --- Render Helpers ---

    const SortIcon = ({ columnKey }: { columnKey: keyof Member }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-400 opacity-50" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-indigo-600" /> 
            : <ArrowDown size={14} className="text-indigo-600" />;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
            {/* 4. Toaster */}
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Database Anggota</h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola data sensus jamaah secara terpusat.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={() => { refreshMembers(); toast.success('Data diperbarui'); }} 
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => navigate('/members/new')} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                    >
                        <Plus size={18} /> Tambah Anggota
                    </button>
                </div>
            </div>

            {/* Toolbar: Search, Filter, Export */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <input 
                        type="text" 
                        placeholder="Cari nama, keluarga, dll..." 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsFilterOpen(true)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-all flex-1 md:flex-none
                            ${(selectedGender.length || selectedLevel.length || selectedMarriageStatus.length || memberStatus !== 'Aktif') 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter size={18} /> Filter
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-all flex-1 md:flex-none"
                    >
                        <Download size={18} /> Export
                    </button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Table Wrapper for Horizontal Scroll */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                {[
                                    { label: 'Nama Panggilan', key: 'name', width: 'min-w-[200px]' },
                                    { label: 'Jenjang', key: 'level', width: 'min-w-[120px]' },
                                    { label: 'Gender', key: 'gender', width: 'min-w-[120px]' },
                                    { label: 'Umur', key: 'age', width: 'w-24' },
                                    { label: 'Tgl Lahir', key: 'date_of_birth', width: 'min-w-[150px]' },
                                    { label: 'Status Nikah', key: 'marriage_status', width: 'min-w-[140px]' },
                                    { label: 'Keluarga', key: 'family_name', width: 'min-w-[120px]' },
                                    { label: 'No', key: 'order', width: 'w-16' },
                                ].map((col) => (
                                    <th 
                                        key={col.key} 
                                        className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors ${col.width}`}
                                        onClick={() => handleSort(col.key as keyof Member)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                            <SortIcon columnKey={col.key as keyof Member} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-center w-24 sticky right-0 bg-slate-50 z-20 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                            {paginatedMembers.length > 0 ? paginatedMembers.map((row) => (
                                <tr 
                                    key={row.uuid} 
                                    className="hover:bg-indigo-50 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/members/${row.uuid}`)}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {highlightMatch(row.alias || row.name, searchText)}
                                        {row.alias && row.alias !== row.name && (
                                            <div className="text-xs text-slate-400 font-normal mt-0.5">{row.name}</div>
                                        )}
                                        {!row.is_active && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200">NON-AKTIF</span>}
                                    </td>
                                    <td className="px-6 py-4"><Badge color="blue">{row.level}</Badge></td>
                                    <td className="px-6 py-4">{row.gender}</td>
                                    <td className="px-6 py-4 font-medium">{row.age} Th</td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {row.date_of_birth ? dayjs(row.date_of_birth).format('DD MMM YYYY') : '-'}
                                    </td>
                                    <td className="px-6 py-4">{row.marriage_status}</td>
                                    <td className="px-6 py-4 text-slate-500">{highlightMatch(row.family_name, searchText)}</td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">#{row.order}</td>
                                    
                                    <td 
                                        className="px-6 py-4 text-center sticky right-0 z-20 bg-white group-hover:bg-indigo-50 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]"
                                        onClick={(e) => e.stopPropagation()} 
                                    >
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => navigate(`/members/${row.uuid}/edit`)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(row)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="text-slate-300 mb-2" />
                                            <p className="font-medium">Data tidak ditemukan</p>
                                            <p className="text-xs">Coba ubah kata kunci atau filter pencarian Anda.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-sm text-slate-500">
                        Menampilkan <span className="font-bold text-slate-800">{paginatedMembers.length}</span> dari <span className="font-bold text-slate-800">{processedMembers.length}</span> data
                    </span>
                    
                    <div className="flex items-center gap-3">
                        {/* Page Size Selector */}
                        <div className="relative">
                            <select 
                                value={pageSize} 
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value={15}>15 baris</option>
                                <option value={30}>30 baris</option>
                                <option value={50}>50 baris</option>
                                <option value={100}>100 baris</option>
                            </select>
                            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-slate-200 text-slate-600 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="px-4 py-2 bg-white text-sm font-semibold text-slate-700 min-w-[80px] text-center">
                                {currentPage} / {totalPages || 1}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 text-slate-600 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FILTER MODAL (Tailwind) --- */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Filter size={18} className="text-indigo-600" /> Filter Data</h3>
                            <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Status Keaktifan */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Status Keaktifan</label>
                                <select 
                                    value={memberStatus} 
                                    onChange={(e) => setMemberStatus(e.target.value as any)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="Aktif">Aktif Saja</option>
                                    <option value="Tidak Aktif">Tidak Aktif Saja</option>
                                    <option value="Semua">Semua Data</option>
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenis Kelamin</label>
                                <div className="flex gap-3">
                                    {['Laki - Laki', 'Perempuan'].map(g => (
                                        <label key={g} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer p-3 border rounded-xl transition-all ${selectedGender.includes(g) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedGender.includes(g)}
                                                onChange={(e) => {
                                                    if(e.target.checked) setSelectedGender([...selectedGender, g]);
                                                    else setSelectedGender(selectedGender.filter(x => x !== g));
                                                }}
                                                className="hidden" // Sembunyikan checkbox asli, gunakan styling label
                                            />
                                            {g}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Level (Dropdown Multi) */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Jenjang Pendidikan</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {Array.from(new Set(members.map(m => m.level))).filter(Boolean).sort().map(lvl => (
                                        <label key={lvl} className={`flex items-center gap-2 cursor-pointer p-2.5 border rounded-lg transition-colors ${selectedLevel.includes(lvl) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLevel.includes(lvl)}
                                                onChange={(e) => {
                                                    if(e.target.checked) setSelectedLevel([...selectedLevel, lvl]);
                                                    else setSelectedLevel(selectedLevel.filter(x => x !== lvl));
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                                            />
                                            <span className={`text-sm ${selectedLevel.includes(lvl) ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}>{lvl}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200">
                            <button 
                                onClick={() => {
                                    setSelectedGender([]);
                                    setSelectedLevel([]);
                                    setSelectedMarriageStatus([]);
                                    setMemberStatus('Aktif');
                                }}
                                className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Reset
                            </button>
                            <button 
                                onClick={() => setIsFilterOpen(false)}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PASSWORD MODAL (Tailwind) --- */}
            {openPasswordDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Verifikasi Keamanan</h3>
                        <p className="text-sm text-slate-500 mb-6">Masukkan password admin untuk melanjutkan tindakan ini.</p>
                        
                        <input 
                            type="password" 
                            autoFocus
                            placeholder="Masukkan Password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none mb-6"
                        />
                        
                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setOpenPasswordDialog(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit"
                                disabled={loadingPassword}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loadingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Konfirmasi'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}