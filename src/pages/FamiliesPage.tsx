import { useEffect, useState } from 'react';
import {
    collection, query, where, orderBy, getDocs,
    addDoc, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check, Users } from 'lucide-react';

const KELOMPOK_OPTIONS = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5'];

interface Family {
    id: string;
    name: string;
    kelompok: string;
}

const EMPTY_FORM = { name: '', kelompok: '' };

export default function FamiliesPage() {
    const [families, setFamilies] = useState<Family[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [kelompokFilter, setKelompokFilter] = useState('');
    const { profile } = useAuth();

    // Status 0 & 1 = full access; status 3 = CRUD kelompok sendiri; status 2,4,5 = read-only
    const canEdit = profile?.status === 0 || profile?.status === 1 || profile?.status === 3;
    const isKelompokAdmin = profile?.status === 3;

    const fetchFamilies = async () => {
        setLoading(true);
        try {
            let q;
            if (profile?.status === 3) {
                // Pengurus Kelompok → hanya keluarga kelompoknya sendiri
                q = query(
                    collection(db, 'families'),
                    where('kelompok', '==', profile.kelompok),
                    orderBy('name', 'asc')
                );
            } else {
                q = query(collection(db, 'families'), orderBy('name', 'asc'));
            }
            const snap = await getDocs(q);
            const data: Family[] = snap.docs.map(d => ({
                id: d.id,
                name: d.data().name ?? '',
                kelompok: d.data().kelompok ?? '',
            }));
            setFamilies(data);
        } catch (e) {
            console.error(e);
            toast.error('Gagal memuat data keluarga');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFamilies(); }, [profile]);

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
                setFamilies(prev => prev.map(f =>
                    f.id === editingId ? { ...f, name: form.name.trim(), kelompok: form.kelompok } : f
                ));
                toast.success('Keluarga berhasil diperbarui');
            } else {
                const ref = await addDoc(collection(db, 'families'), {
                    name: form.name.trim(),
                    kelompok: form.kelompok,
                });
                setFamilies(prev => [...prev, { id: ref.id, name: form.name.trim(), kelompok: form.kelompok }]
                    .sort((a, b) => a.name.localeCompare(b.name)));
                toast.success('Keluarga berhasil ditambahkan');
            }
            setShowModal(false);
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
            setFamilies(prev => prev.filter(x => x.id !== f.id));
            toast.success('Keluarga berhasil dihapus');
        } catch (e) {
            console.error(e);
            toast.error('Gagal menghapus data');
        } finally {
            setDeletingId(null);
        }
    };

    // Display filter
    const displayed = families.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
        const matchKelompok = kelompokFilter ? f.kelompok === kelompokFilter : true;
        // Status 3/4/5 only see their own kelompok
        const matchRole = (profile?.status ?? 0) <= 2 || f.kelompok === profile?.kelompok;
        return matchSearch && matchKelompok && matchRole;
    });

    const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm";

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Daftar Keluarga</h1>
                    <p className="text-slate-500 text-sm mt-0.5">{displayed.length} keluarga ditemukan</p>
                </div>
                {canEdit && (
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-200 transition-all"
                    >
                        <Plus size={16} /> Tambah Keluarga
                    </button>
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
                            className={inputClass + ' appearance-none pr-8'}
                        >
                            <option value="">Semua Kelompok</option>
                            {KELOMPOK_OPTIONS.map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
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
                            {displayed.map((f, i) => (
                                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3.5 text-sm text-slate-400 w-12">{i + 1}</td>
                                    <td className="px-6 py-3.5 text-sm font-medium text-slate-800">{f.name}</td>
                                    <td className="px-6 py-3.5 text-sm text-slate-500">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                            {f.kelompok || '-'}
                                        </span>
                                    </td>
                                    {canEdit && (
                                        <td className="px-6 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(f)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60 shadow-md shadow-indigo-200"
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
        </div>
    );
}
