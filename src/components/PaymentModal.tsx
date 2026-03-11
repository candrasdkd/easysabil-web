import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    price: number;
    actualPricePay: string;
    setActualPricePay: (val: string) => void;
    isExactChange: boolean;
    setIsExactChange: (val: boolean) => void;
    paymentMethod: string;
    setPaymentMethod: (val: string) => void;
    moneyHolder: string;
    setMoneyHolder: (val: string) => void;
    uploading: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    price,
    actualPricePay,
    setActualPricePay,
    isExactChange,
    setIsExactChange,
    paymentMethod,
    setPaymentMethod,
    moneyHolder,
    setMoneyHolder,
    uploading
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800">Pembayaran Cepat</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Tagihan</p>
                        <p className="text-3xl font-black text-slate-900">{formatRupiah(price)}</p>
                    </div>

                    <div className="space-y-4">
                        <div
                            onClick={() => setIsExactChange(!isExactChange)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isExactChange ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isExactChange ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <CheckCircle2 size={18} />
                                </div>
                                <span className={`font-bold ${isExactChange ? 'text-emerald-700' : 'text-slate-500'}`}>Uang Pas</span>
                            </div>
                            {isExactChange && <span className="text-xs font-black text-emerald-600">Terpilih</span>}
                        </div>

                        {!isExactChange && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-sm font-bold text-slate-700">Jumlah Uang Diterima</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">Rp</span>
                                    <input
                                        type="text"
                                        placeholder="0"
                                        className="w-full pl-16 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black text-2xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                                        value={actualPricePay ? Number(String(actualPricePay).replace(/[^0-9]/g, "")).toLocaleString('id-ID') : ""}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, "");
                                            setActualPricePay(val);
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-2">
                                    Masukkan nominal tanpa titik/koma
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Pemegang Uang</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    value={moneyHolder}
                                    onChange={(e) => setMoneyHolder(e.target.value)}
                                >
                                    {['Sutoyo', 'Riko', 'Candra', 'Fahmi', 'Fachih'].map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Metode</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Transfer">Transfer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all">Batal</button>
                    <button
                        disabled={uploading}
                        onClick={onConfirm}
                        className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                    >
                        {uploading ? "Memproses..." : "Konfirmasi Bayar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
