import { useState, useEffect, useMemo } from 'react';
import {
    collection,
    addDoc, doc, updateDoc, deleteDoc, writeBatch, getDocs
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, Users, Download, Upload, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useFamiliesStore } from '../store/familiesStore';

const KELOMPOK_OPTIONS = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5'];
const INITIAL_PAGE_SIZE = 15;

interface Family {
    id: string;
    name: string;
    kelompok: string;
}

const EMPTY_FORM = { name: '', kelompok: '' };

export default function FamiliesPage() {
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [kelompokFilter, setKelompokFilter] = useState('');
    const { profile } = useAuth();

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);

    // Status 0 & 1 = full access; status 3 = CRUD kelompok sendiri; status 2,4,5 = read-only
    const canEdit = profile?.status === 0 || profile?.status === 1 || profile?.status === 3;
    const isKelompokAdmin = profile?.status === 3;

    // Ambil data families dari store (ter-cache)
    const { families, loading, isInitialized, fetchFamilies, invalidate } = useFamiliesStore();

    useEffect(() => {
        if (profile) fetchFamilies(profile);
    }, [profile, fetchFamilies]);

    // Helper: refresh store setelah mutasi
    const refreshStore = () => {
        if (profile) { invalidate(); fetchFamilies(profile); }
    };

    const openCreate = () => {
        setEditingId(null);
        // Status 3: auto-set kelompok to their own
        setForm({ name: '', kelompok: isKelompokAdmin ? (profile?.kelompok ?? '') : '' });
        setShowModal(true);
    };

    const openEdit = (f: Family) => {
        setEditingId(f.id);
        setForm({ name: f.name, kelompok: f.kelompok });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.kelompok) {
            toast.error('Mohon lengkapi nama dan kelompok');
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, 'families', editingId), {
                    name: form.name.trim(),
                    kelompok: form.kelompok,
                });
                toast.success('Keluarga berhasil diperbarui');
            } else {
                await addDoc(collection(db, 'families'), {
                    name: form.name.trim(),
                    kelompok: form.kelompok,
                });
                toast.success('Keluarga berhasil ditambahkan');
            }
            setShowModal(false);
            refreshStore();
        } catch (e) {
            console.error(e);
            toast.error('Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (f: Family) => {
        if (!window.confirm(`Hapus keluarga "${f.name}"?`)) return;
        setDeletingId(f.id);
        try {
            await deleteDoc(doc(db, 'families', f.id));
            toast.success('Keluarga berhasil dihapus');
            refreshStore();
        } finally {
            setDeletingId(null);
        }
    };

    // --- EXCEL IMPORT ---
    const handleDownloadTemplate = () => {
        const headers = ['Nama Keluarga', 'Kelompok'];

        let sampleData = [
            ['KELUARGA BUDI', 'Kelompok 1'],
            ['KELUARGA RIZAL', 'Kelompok 2']
        ];

        // Jika admin kelompok, fix template ke kelompok sendiri
        if (isKelompokAdmin && profile?.kelompok) {
            sampleData = [
                ['KELUARGA BUDI', profile.kelompok],
                ['KELUARGA RIZAL', profile.kelompok]
            ];
        }

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

        ws['!cols'] = [
            { wch: 30 }, // Nama Keluarga
            { wch: 20 }, // Kelompok
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import');

        const fileName = 'Template_Import_Keluarga.xlsx';
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
        toast.success('Template berhasil diunduh');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading('Memproses file Excel...');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

            // Cari index header text
            let headerRowIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
                if (jsonData[i] && jsonData[i].includes('Nama Keluarga')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error('Format template tidak valid. Pastikan menggunakan file template yang benar.');
            }

            const headers: string[] = jsonData[headerRowIndex];
            const getColIndex = (name: string) => headers.findIndex(h => typeof h === 'string' && h.includes(name));

            const colName = getColIndex('Nama Keluarga');
            const colKelompok = getColIndex('Kelompok');

            if (colName === -1 || colKelompok === -1) {
                throw new Error('Kolom Nama Keluarga atau Kelompok tidak ditemukan di tabel.');
            }

            const recordsToImport = [];

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[colName]) continue;

                const familyName = row[colName]?.toString().trim()?.toUpperCase() || '';
                if (!familyName) continue;

                let kelompokValue = row[colKelompok]?.toString().trim() || '';

                // Pastikan admin kelompok hanya bisa import ke kelompoknya sendiri
                if (isKelompokAdmin && profile?.kelompok) {
                    kelompokValue = profile.kelompok;
                } else if (!kelompokValue) {
                    throw new Error(`Keluarga ${familyName} tidak memiliki kelompok. Cek kembali file excel Anda.`);
                }

                recordsToImport.push({
                    name: familyName,
                    kelompok: kelompokValue,
                });
            }

            if (recordsToImport.length === 0) {
                throw new Error('Tidak ada data yang ditemukan untuk diimport.');
            }

            toast.loading(`Memasukkan ${recordsToImport.length} data ke database...`, { id: toastId });

            const familiesColRef = collection(db, 'families');
            const chunks = [];
            for (let i = 0; i < recordsToImport.length; i += 450) {
                chunks.push(recordsToImport.slice(i, i + 450));
            }

            for (const chunk of chunks) {
                const chBatch = writeBatch(db);
                for (const record of chunk) {
                    const newRef = doc(familiesColRef);
                    chBatch.set(newRef, record);
                }
                await chBatch.commit();
            }

            toast.success(`${recordsToImport.length} data keluarga berhasil diimport`, { id: toastId });
            setIsImportModalOpen(false);
            refreshStore();

        } catch (error: any) {
            toast.error(`Gagal import: ${error.message}`, { id: toastId, duration: 8000 });
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset file input
        }
    };

    const handleRollbackImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading('Membaca file Excel untuk dibatalkan...');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

            let headerRowIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
                if (jsonData[i] && jsonData[i].includes('Nama Keluarga')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                throw new Error('Format template tidak valid. Pastikan menggunakan file template yang sama.');
            }

            const headers: string[] = jsonData[headerRowIndex];
            const colName = headers.findIndex(h => typeof h === 'string' && h.includes('Nama Keluarga'));

            if (colName === -1) {
                throw new Error('Kolom Nama Keluarga tidak ditemukan.');
            }

            const namesToDelete = new Set<string>();
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0 || !row[colName]) continue;
                namesToDelete.add(row[colName].toString().trim().toUpperCase());
            }

            if (namesToDelete.size === 0) {
                throw new Error('Tidak ada nama keluarga yang ditemukan untuk dihapus.');
            }

            // We need to fetch all families first or use the state `displayed` (or maybe fetch fresh)
            // But we already have `displayed` which contains the current loaded data? Let's fetch fresh.
            const querySnapshot = await getDocs(collection(db, 'families'));
            const allFamilies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any as Family[];

            const familiesToDelete = allFamilies.filter(f => namesToDelete.has(f.name.toUpperCase()));

            if (familiesToDelete.length === 0) {
                toast.success('Tidak ada data keluarga yang cocok untuk dihapus (Mungkin sudah dihapus).', { id: toastId });
                setIsImportModalOpen(false);
                return;
            }

            const confirmDelete = window.confirm(`Ditemukan ${familiesToDelete.length} keluarga dari Excel yang cocok di database saat ini. Yakin ingin MENGHAPUS mereka semua? (Aksi ini tidak bisa dikembalikan)`);
            if (!confirmDelete) {
                toast.dismiss(toastId);
                return;
            }

            toast.loading(`Menghapus ${familiesToDelete.length} data keluarga dari database...`, { id: toastId });

            const familiesColRef = collection(db, 'families');
            const chunks = [];
            for (let i = 0; i < familiesToDelete.length; i += 450) {
                chunks.push(familiesToDelete.slice(i, i + 450));
            }

            for (const chunk of chunks) {
                const chBatch = writeBatch(db);
                for (const record of chunk) {
                    const docRef = doc(familiesColRef, record.id);
                    chBatch.delete(docRef);
                }
                await chBatch.commit();
            }

            toast.success(`${familiesToDelete.length} data keluarga berhasil dibatalkan (dihapus)`, { id: toastId });
            setIsImportModalOpen(false);
            refreshStore();

        } catch (error: any) {
            toast.error(`Gagal rollback: ${error.message}`, { id: toastId, duration: 8000 });
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset file input
        }
    };

    const displayed = useMemo(() => {
        return families.filter(f => {
            const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
            const matchKelompok = kelompokFilter ? f.kelompok === kelompokFilter : true;
            // Status 3/4/5 only see their own kelompok
            const matchRole = (profile?.status ?? 0) <= 2 || f.kelompok === profile?.kelompok;
            return matchSearch && matchKelompok && matchRole;
        });
    }, [families, search, kelompokFilter, profile]);

    const paginatedDisplayed = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return displayed.slice(start, start + pageSize);
    }, [displayed, currentPage, pageSize]);

    const totalPages = Math.ceil(displayed.length / pageSize);

    // Reset pagination to page 1 on search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, kelompokFilter]);

    const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm";

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Daftar Keluarga</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{displayed.length} keluarga ditemukan</p>
                </div>
                {canEdit && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshStore}
                            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl text-sm transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={loading && !isInitialized ? "animate-spin" : ""} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl text-sm transition-all"
                            title="Import Excel"
                        >
                            <Upload size={16} /> <span className="hidden sm:inline">Import</span>
                        </button>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-200 transition-all"
                        >
                            <Plus size={16} /> Tambah Keluarga
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <input
                    type="text"
                    placeholder="Cari nama keluarga..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={inputClass + ' sm:max-w-xs'}
                />
                {(profile?.status ?? 0) <= 2 && (
                    <div className="relative sm:w-48">
                        <select
                            value={kelompokFilter}
                            onChange={e => setKelompokFilter(e.target.value)}
                            className={inputClass + ' appearance-none pr-10 cursor-pointer'}
                        >
                            <option value="">Semua Kelompok</option>
                            {KELOMPOK_OPTIONS.map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {(!isInitialized && loading) ? (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
                        Memuat data...
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                        <Users size={32} className="mb-2 opacity-40" />
                        <p className="text-sm">Belum ada data keluarga</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Keluarga</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kelompok</th>
                                {canEdit && <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedDisplayed.map((f, i) => (
                                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3.5 text-sm text-slate-400 w-12">{((currentPage - 1) * pageSize) + i + 1}</td>
                                    <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{f.name}</td>
                                    <td className="px-6 py-3.5 text-sm text-slate-500">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                            {f.kelompok || '-'}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(f)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(f)}
                                                    disabled={deletingId === f.id}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Hapus"
                                                >
                                                    {deletingId === f.id
                                                        ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                                        : <Trash2 size={15} />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination Controls */}
                {displayed.length > 0 && (
                    <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <span className="text-sm text-slate-500">
                            Menampilkan <span className="font-bold text-slate-800">{paginatedDisplayed.length}</span> dari <span className="font-bold text-slate-800">{displayed.length}</span> data
                        </span>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value={15}>15 baris</option>
                                    <option value={30}>30 baris</option>
                                    <option value={50}>50 baris</option>
                                    <option value={100}>100 baris</option>
                                </select>
                                <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>

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
                )}
            </div>

            {/* Modal Add / Edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-up">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingId ? 'Edit Keluarga' : 'Tambah Keluarga'}
                            </h3>
                            <button onClick={() => !saving && setShowModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Keluarga</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="cth. Keluarga Ahmad"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kelompok</label>
                                {isKelompokAdmin ? (
                                    // Status 3: kelompok dikunci ke kelompok sendiri
                                    <div className={inputClass + ' bg-slate-50 text-slate-500 cursor-not-allowed'}>
                                        {form.kelompok || '-'}
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={form.kelompok}
                                        onChange={e => setForm(f => ({ ...f, kelompok: e.target.value }))}
                                        className={inputClass + ' appearance-none'}
                                    >
                                        <option value="" disabled>Pilih Kelompok</option>
                                        {KELOMPOK_OPTIONS.map(k => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-md shadow-blue-200"
                                >
                                    {saving
                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <Check size={16} />
                                    }
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- IMPORT EXCEL MODAL --- */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Upload size={18} className="text-blue-600" /> Import File Excel
                            </h3>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <h4 className="font-semibold text-blue-800 text-sm mb-1">Penting:</h4>
                                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                                    <li>Gunakan template excel yang telah disediakan.</li>
                                    <li>Kolom <b>Nama Keluarga</b> otomatis diubah menjadi <b>HURUF BESAR</b>.</li>
                                    {isKelompokAdmin && <li>Karena Anda adalah Pengurus, kelompok otomatis diatur ke kelompok Anda.</li>}
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
                                >
                                    <Download size={18} className="text-slate-500" /> Download Template Import
                                </button>

                                <label className="w-full relative flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200 cursor-pointer text-center">
                                    <Upload size={18} />
                                    {isImporting ? 'Memproses...' : 'Pilih File Excel & Import'}
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={isImporting}
                                    />
                                </label>

                                <div className="pt-4 border-t border-slate-200 mt-2">
                                    <h5 className="text-sm font-semibold text-slate-700 mb-2">Pernah salah import data?</h5>
                                    <label className="w-full relative flex items-center justify-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-sm font-medium hover:bg-rose-50 transition-all cursor-pointer text-center">
                                        <Trash2 size={16} />
                                        {isImporting ? 'Memproses...' : 'Hapus (Rollback) Data dari Excel Sama'}
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleRollbackImport}
                                            className="hidden"
                                            disabled={isImporting}
                                        />
                                    </label>
                                    <p className="text-xs text-slate-500 mt-2 text-center">Pilih file Excel yang salah, dan sistem akan menghapus keluarga di database yang memiliki nama yang sama dengan di file Anda.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
