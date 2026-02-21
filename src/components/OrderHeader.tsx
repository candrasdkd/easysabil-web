import React from 'react';
import { ShoppingBag, Lock, Share2, Filter, Plus } from 'lucide-react';

interface OrderHeaderProps {
    categoryLabel: string;
    dataCount: number;
    isAuthenticated: boolean;
    onLockSession: () => void;
    onCopyReport: () => void;
    onOpenFilter: () => void;
    onAddOrder: () => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
    categoryLabel,
    dataCount,
    isAuthenticated,
    onLockSession,
    onCopyReport,
    onOpenFilter,
    onAddOrder
}) => {
    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingBag className="text-indigo-600" /> Daftar Pesanan
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {categoryLabel || "Semua Kategori"} • {dataCount} Data
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {isAuthenticated && (
                            <button onClick={onLockSession} className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-all mr-2">
                                <Lock size={16} /> Kunci
                            </button>
                        )}
                        <button
                            onClick={onCopyReport}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all"
                        >
                            <Share2 size={18} /> Bagikan
                        </button>
                        <button
                            onClick={onOpenFilter}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all"
                        >
                            <Filter size={18} /> Filter
                        </button>
                        <button
                            onClick={onAddOrder}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                        >
                            <Plus size={18} /> Tambah
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderHeader;
