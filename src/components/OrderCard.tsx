import React from 'react';
import { User, Edit2, Trash2, CreditCard } from 'lucide-react';
import type { DataOrder } from '../types/Order';

interface OrderCardProps {
    order: DataOrder;
    onEdit: (order: DataOrder) => void;
    onDelete: (id: number) => void;
    onPay: (order: DataOrder) => void;
    formatRupiah: (n: string | number) => string;
}

const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onEdit,
    onDelete,
    onPay,
    formatRupiah
}) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${order.is_payment ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{order.user_name}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.is_payment ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {order.is_payment ? 'Lunas' : 'Belum Bayar'}
                        </span>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(order)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(order.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Item</span>
                    <span className="font-semibold text-slate-800">{order.name_category}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Jumlah</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 rounded-lg">{order.total_order} pcs</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Tagihan</p>
                        <p className="text-lg font-black text-slate-900">{formatRupiah(order.unit_price * order.total_order)}</p>
                    </div>
                    {order.actual_price > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                Diterima ({order.money_holder || '?'})
                            </p>
                            <p className="text-sm font-bold text-emerald-600">{formatRupiah(order.actual_price)}</p>
                        </div>
                    )}
                </div>
            </div>

            {order.note && (
                <div className="mb-4 p-2 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                    "{order.note}"
                </div>
            )}

            {!order.is_payment && (
                <button
                    onClick={() => onPay(order)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                    <CreditCard size={18} /> Bayar Sekarang
                </button>
            )}
        </div>
    );
};

export default OrderCard;
