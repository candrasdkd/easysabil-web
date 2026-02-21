import React from 'react';
import { X, Search, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { DataDropdown } from '../types/Order';

interface OrderFormModalProps {
    isOpen: boolean;
    isUpdate: boolean;
    dataUpload: any;
    setDataUpload: (data: any) => void;
    memberSearch: string;
    setMemberSearch: (val: string) => void;
    isMemberDropdownOpen: boolean;
    setIsMemberDropdownOpen: (open: boolean) => void;
    filteredMembers: DataDropdown[];
    dataDropdownCategory: DataDropdown[];
    onSave: () => void;
    onClose: () => void;
    uploading: boolean;
    memberRef: React.RefObject<HTMLDivElement | null>;
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({
    isOpen,
    isUpdate,
    dataUpload,
    setDataUpload,
    memberSearch,
    setMemberSearch,
    isMemberDropdownOpen,
    setIsMemberDropdownOpen,
    filteredMembers,
    dataDropdownCategory,
    onSave,
    onClose,
    uploading,
    memberRef
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800">{isUpdate ? "Edit Pesanan" : "Pesanan Baru"}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
                </div>
                <div className="p-8 space-y-5 overflow-y-auto">
                    {/* Searchable Member Dropdown */}
                    <div className="space-y-2" ref={memberRef}>
                        <label className="text-sm font-bold text-slate-700">Nama Pemesan</label>
                        <div className="relative">
                            <div
                                className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 cursor-pointer focus-within:border-indigo-500 focus-within:bg-white transition-all"
                                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                            >
                                <Search className="text-slate-400 mr-3" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari nama..."
                                    className="bg-transparent outline-none w-full font-medium"
                                    value={memberSearch}
                                    onChange={(e) => { setMemberSearch(e.target.value); setIsMemberDropdownOpen(true); }}
                                />
                                <ChevronDown className={`text-slate-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                            </div>

                            {isMemberDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in zoom-in-95 duration-150">
                                    {filteredMembers.length > 0 ? filteredMembers.map(m => (
                                        <div
                                            key={m.id}
                                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                                            onClick={() => {
                                                setDataUpload({ ...dataUpload, user: { label: m.label, value: m.label, id: String(m.id) } });
                                                setMemberSearch(m.label);
                                                setIsMemberDropdownOpen(false);
                                            }}
                                        >
                                            <span className="font-medium text-slate-700">{m.label}</span>
                                            {dataUpload.user.id === String(m.id) && <CheckCircle2 className="text-indigo-600" size={16} />}
                                        </div>
                                    )) : <div className="px-4 py-6 text-center text-slate-400 text-sm italic">Nama tidak ditemukan</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Kategori Pesanan</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            value={dataUpload.category.id}
                            onChange={(e) => {
                                const selected = dataDropdownCategory.find(cat => String(cat.id) === e.target.value);
                                if (selected) {
                                    setDataUpload({
                                        ...dataUpload,
                                        category: {
                                            label: selected.label,
                                            value: selected.label,
                                            id: String(selected.id),
                                            name: selected.name || "",
                                            price: String(selected.price || "")
                                        }
                                    });
                                }
                            }}
                        >
                            <option value="">Pilih Kategori...</option>
                            {dataDropdownCategory.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Jumlah Pesanan</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                value={dataUpload.totalOrder}
                                onChange={(e) => setDataUpload({ ...dataUpload, totalOrder: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Total Harga</label>
                            <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-500 flex items-center">
                                Rp {parseInt(dataUpload.totalOrder || "0") * parseInt(dataUpload.category.price || "0")}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Catatan (Opsional)</label>
                        <textarea
                            placeholder="Contoh: Ukuran L, Tanpa Sambal, dsb."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all min-h-[80px]"
                            value={dataUpload.note}
                            onChange={(e) => setDataUpload({ ...dataUpload, note: e.target.value })}
                        />
                    </div>

                    {/* Payment Section */}
                    <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="flex items-center justify-between p-1 bg-slate-50 rounded-2xl border border-slate-100">
                            <button
                                onClick={() => setDataUpload({ ...dataUpload, isPayment: false })}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${!dataUpload.isPayment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                            >
                                Belum Bayar
                            </button>
                            <button
                                onClick={() => setDataUpload({ ...dataUpload, isPayment: true })}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${dataUpload.isPayment ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                Sudah Lunas
                            </button>
                        </div>

                        {dataUpload.isPayment && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Diterima Ke (Holder)</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={dataUpload.moneyHolder}
                                        onChange={(e) => setDataUpload({ ...dataUpload, moneyHolder: e.target.value })}
                                    >
                                        <option value="">Pilih Pemegang Uang...</option>
                                        {['Sutoyo', 'Riko', 'Candra', 'Fahmi', 'Fachih'].map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Metode</label>
                                        <select
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-medium outline-none"
                                            value={dataUpload.paymentMethod}
                                            onChange={(e) => setDataUpload({ ...dataUpload, paymentMethod: e.target.value })}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Transfer">Transfer</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Nominal Uang</label>
                                        <input
                                            type="text"
                                            placeholder="Rp 0"
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-emerald-600 outline-none"
                                            value={dataUpload.actualPrice}
                                            onChange={(e) => setDataUpload({ ...dataUpload, actualPrice: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
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
                        disabled={uploading}
                        onClick={onSave}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                        {uploading ? "Menyimpan..." : (isUpdate ? "Simpan Perubahan" : "Buat Pesanan")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderFormModal;
