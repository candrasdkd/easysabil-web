import React from 'react';
import { X, Filter } from 'lucide-react';
import type { DataDropdown } from '../types/Order';

interface OrderFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryLabel: string;
    onCategoryChange: (label: string, id: string | null) => void;
    dataDropdownCategory: DataDropdown[];
    isPayment: boolean | null;
    onPaymentStatusChange: (status: boolean | null) => void;
    onReset: () => void;
    onApply: () => void;
}

const OrderFilterModal: React.FC<OrderFilterModalProps> = ({
    isOpen,
    onClose,
    categoryLabel,
    onCategoryChange,
    dataDropdownCategory,
    isPayment,
    onPaymentStatusChange,
    onReset,
    onApply
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Filter size={18} /> Filter Data
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategori</label>
                        <select
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                            value={categoryLabel}
                            onChange={(e) => {
                                const selected = dataDropdownCategory.find(c => c.value === e.target.value);
                                onCategoryChange(e.target.value, selected ? String(selected.id) : null);
                            }}
                        >
                            <option value="">Semua Kategori</option>
                            {dataDropdownCategory.map(c => <option key={c.id} value={String(c.value)}>{c.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Bayar</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Semua', val: null },
                                { label: 'Lunas', val: true },
                                { label: 'Belum', val: false }
                            ].map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => onPaymentStatusChange(s.val)}
                                    className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${isPayment === s.val ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onReset}
                        className="px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all"
                    >
                        Reset
                    </button>
                    <button
                        onClick={onApply}
                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderFilterModal;
