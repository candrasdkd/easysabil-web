import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router";
import { useCategoryOrdersStore, type OrderCategory } from '../store/categoryOrdersStore';
import {
    RefreshCw,
    AlertCircle,
    Calendar,
    Tag,
    ChevronRight,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    X,
    AlertTriangle,
    Save,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';

// --- TYPES ---

type ModalMode = 'add' | 'edit' | null;

interface FormState {
    name: string;
    price: string;
    year: string;
}

const EMPTY_FORM: FormState = { name: '', price: '', year: new Date().getFullYear().toString() };

// --- HELPER FUNCTIONS ---
const formatPrice = (v: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(v);



// --- COMPONENT: CATEGORY CARD ---
const CategoryCard = ({
    data,
    onSelect,
    onEdit,
    onDelete,
}: {
    data: OrderCategory;
    onSelect: (c: OrderCategory) => void;
    onEdit: (c: OrderCategory) => void;
    onDelete: (c: OrderCategory) => void;
}) => {

    return (
        <div className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-200 hover:shadow-md">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Tag size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 line-clamp-1" title={data.name}>
                        {data.name}
                    </h3>
                </div>
                <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Calendar size={11} /> {data.year}
                </span>
            </div>

            {/* ── Price ── */}
            <div className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Harga Satuan</p>
                <p className="text-xl font-bold text-slate-900">{formatPrice(data.price)}</p>
            </div>

            {/* ── Footer Actions ── */}
            <div className="px-3 pb-3 flex items-center gap-1 border-t border-slate-100 pt-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(data); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                    <Pencil size={12} /> Edit
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(data); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                    <Trash2 size={12} /> Hapus
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button
                    onClick={() => onSelect(data)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    Lihat <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: FORM MODAL (Add / Edit) ---
const CategoryFormModal = ({
    mode,
    form,
    saving,
    onClose,
    onChange,
    onSubmit,
}: {
    mode: ModalMode;
    form: FormState;
    saving: boolean;
    onClose: () => void;
    onChange: (f: FormState) => void;
    onSubmit: () => void;
}) => {
    if (!mode) return null;

    const isEdit = mode === 'edit';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            {isEdit ? 'Edit Kategori' : 'Tambah Kategori'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {isEdit ? 'Perbarui data kategori pesanan.' : 'Isi detail kategori pesanan baru.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="px-6 pb-4 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Kategori</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => onChange({ ...form, name: e.target.value })}
                            placeholder="Contoh: Paket A, Qurban Sapi..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Harga (IDR)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm pointer-events-none">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={form.price ? Number(form.price).toLocaleString('id-ID') : ''}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                    onChange({ ...form, price: raw });
                                }}
                                placeholder="0"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tahun</label>
                        <input
                            type="number"
                            min={2000}
                            max={2100}
                            value={form.year}
                            onChange={(e) => onChange({ ...form, year: e.target.value })}
                            placeholder="Contoh: 2025"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={saving || !form.name.trim() || !form.price || !form.year}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: DELETE CONFIRM MODAL ---
const DeleteModal = ({
    target,
    deleting,
    onClose,
    onConfirm,
}: {
    target: OrderCategory | null;
    deleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) => {
    if (!target) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900">Hapus Kategori?</h3>
                        <p className="text-slate-500">
                            Kategori <span className="font-bold text-slate-700">"{target.name} {target.year}"</span> akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
                        </p>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                    >
                        Batal
                    </button>
                    <button
                        disabled={deleting}
                        onClick={onConfirm}
                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
export default function OrderCategoryScreen() {
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
    const navigate = useNavigate();

    // Ambil data dari store (ter-cache)
    const { categories: rows, loading, isInitialized, error, fetchCategories, saveCategory, deleteCategory } = useCategoryOrdersStore();

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    // --- CRUD Modal States ---
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editTarget, setEditTarget] = useState<OrderCategory | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<OrderCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Refresh manual (untuk tombol refresh)
    const handleRefresh = useCallback(async () => {
        useCategoryOrdersStore.getState().invalidate();
        await fetchCategories();
    }, [fetchCategories]);

    const handleSelect = (d: OrderCategory) => {
        const selectedCategory = {
            id: d.id,
            name: d.name,
            label: `${d.name} ${d.year}`,
            value: `${d.name} ${d.year}`,
            price: String(d.price),
            year: d.year,
        };
        navigate("/category-orders/list", { state: { selectedCategory } });
    };

    // --- Open Add Modal ---
    const handleOpenAdd = () => {
        setForm(EMPTY_FORM);
        setEditTarget(null);
        setModalMode('add');
    };

    // --- Open Edit Modal ---
    const handleOpenEdit = (c: OrderCategory) => {
        setForm({ name: c.name, price: String(c.price), year: String(c.year) });
        setEditTarget(c);
        setModalMode('edit');
    };

    // --- Close Form Modal ---
    const handleCloseModal = () => {
        setModalMode(null);
        setEditTarget(null);
    };

    // --- Submit (Add or Edit) ---
    const handleSubmit = async () => {
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                price: Number(form.price),
                year: Number(form.year),
            };
            const result = await saveCategory(payload, modalMode === 'edit' && editTarget ? editTarget.id : undefined);
            if (result.success) {
                handleCloseModal();
                await fetchCategories();
            } else {
                alert(`Gagal menyimpan: ${result.error}`);
            }
        } finally {
            setSaving(false);
        }
    };

    // --- Open Delete Confirm ---
    const handleOpenDelete = (c: OrderCategory) => { setDeleteTarget(c); };

    // --- Confirm Delete ---
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const result = await deleteCategory(deleteTarget.id);
            if (result.success) {
                setDeleteTarget(null);
                await fetchCategories();
            } else {
                alert(`Gagal menghapus: ${result.error}`);
            }
        } finally {
            setDeleting(false);
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">

            {/* Modals */}
            <CategoryFormModal
                mode={modalMode}
                form={form}
                saving={saving}
                onClose={handleCloseModal}
                onChange={setForm}
                onSubmit={handleSubmit}
            />
            <DeleteModal
                target={deleteTarget}
                deleting={deleting}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
            />

            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kategori Pemesanan</h1>
                    <p className="text-sm text-slate-500 mt-1">Pilih kategori untuk melihat atau membuat pesanan baru.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm"
                        title={sortDir === 'desc' ? 'Tahun: Terbaru dulu' : 'Tahun: Terlama dulu'}
                    >
                        {sortDir === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        <span>Tahun</span>
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
                    >
                        <Plus size={18} />
                        <span>Tambah</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Loading State: hanya saat belum pernah fetch */}
                {(!isInitialized && loading) && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                        <p className="text-slate-500 font-medium">Memuat kategori...</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4 text-red-700 mb-6">
                        <AlertCircle size={24} />
                        <div>
                            <p className="font-bold">Gagal memuat data</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && rows.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Tag size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Belum ada kategori</h3>
                        <p className="text-slate-500 mb-5">Data kategori pesanan masih kosong.</p>
                        <button
                            onClick={handleOpenAdd}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
                        >
                            <Plus size={18} /> Tambah Kategori
                        </button>
                    </div>
                )}

                {/* Grid Data */}
                {!loading && !error && rows.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...rows].sort((a, b) => sortDir === 'desc' ? b.year - a.year : a.year - b.year).map((item) => (
                            <CategoryCard
                                key={item.id}
                                data={item}
                                onSelect={handleSelect}
                                onEdit={handleOpenEdit}
                                onDelete={handleOpenDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}