import React from 'react';
import { TrendingUp, X, PieChart, CreditCard, Banknote, Wallet } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface OrderSummaryModalProps {
    stats: {
        totalItems: number;
        paidOrders: number;
        unpaidOrders: number;
        paymentRate: number;
        totalValue: number;
        totalReceived: number;
        gap: number;
        holders: Record<string, number>;
        methods: Record<string, number>;
    };
    onClose: () => void;
}

const MONEY_HOLDERS = ['Sutoyo', 'Riko', 'Candra', 'Fahmi', 'Fachih'];

const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({ stats, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3">
                        <TrendingUp className="text-emerald-500" /> Ringkasan Lengkap
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X /></button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-3xl text-center border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Item</p>
                            <p className="text-xl font-black text-slate-800">{stats.totalItems}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-3xl text-center border border-emerald-100">
                            <p className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Lunas</p>
                            <p className="text-xl font-black text-emerald-700">{stats.paidOrders}</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-3xl text-center border border-amber-100">
                            <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Hutang</p>
                            <p className="text-xl font-black text-amber-700">{stats.unpaidOrders}</p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-3xl text-center border border-indigo-100">
                            <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Rate</p>
                            <p className="text-xl font-black text-indigo-700">{stats.paymentRate.toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left: Financial Summary */}
                        <div className="space-y-6">
                            <h4 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                                <PieChart size={20} className="text-slate-400" /> Keuangan
                            </h4>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-5 bg-slate-900 text-white rounded-[2rem]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-white/10 rounded-2xl"><CreditCard /></div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">POTENSI TOTAL</p>
                                            <span className="font-bold text-lg">Nilai Pesanan</span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-black">{formatRupiah(stats.totalValue)}</span>
                                </div>
                                <div className="flex justify-between items-center p-5 bg-emerald-600 text-white rounded-[2rem]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-white/10 rounded-2xl"><Banknote /></div>
                                        <div>
                                            <p className="text-xs text-emerald-200 font-medium">UANG MASUK</p>
                                            <span className="font-bold text-lg">Total Diterima</span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-black">{formatRupiah(stats.totalReceived)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                        <p className="text-xs font-bold text-slate-400 mb-1">CASH</p>
                                        <p className="text-lg font-black text-slate-800">{formatRupiah(stats.methods['Cash'] || 0)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                        <p className="text-xs font-bold text-slate-400 mb-1">TRANSFER</p>
                                        <p className="text-lg font-black text-slate-800">{formatRupiah(stats.methods['Transfer'] || 0)}</p>
                                    </div>
                                </div>

                                {stats.gap > 0 && (
                                    <div className="flex justify-between items-center p-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-700">
                                        <span className="font-bold">Sisa Belum Dibayar</span>
                                        <span className="text-xl font-black">{formatRupiah(stats.gap)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Money Holders Breakdown */}
                        <div className="space-y-6">
                            <h4 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                                <Wallet size={20} className="text-slate-400" /> Rincian Pemegang Uang
                            </h4>

                            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
                                <div className="space-y-4">
                                    {MONEY_HOLDERS.map(holder => {
                                        const amount = stats.holders[holder] || 0;
                                        return (
                                            <div key={holder} className="flex items-center justify-between pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${amount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                                        {holder.charAt(0)}
                                                    </div>
                                                    <span className={`font-medium ${amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{holder}</span>
                                                </div>
                                                <span className={`font-bold ${amount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {amount > 0 ? formatRupiah(amount) : '-'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Terpegang</span>
                                    <span className="text-lg font-black text-indigo-700">{formatRupiah(stats.totalReceived)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button onClick={onClose} className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-sm">Tutup Ringkasan</button>
                </div>
            </div>
        </div>
    );
};

export default OrderSummaryModal;
