import React from 'react';
import { Lock, X, Loader2 } from 'lucide-react';

interface PasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (e?: React.FormEvent) => void;
    passwordInput: string;
    setPasswordInput: (val: string) => void;
    loadingPassword: boolean;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    passwordInput,
    setPasswordInput,
    loadingPassword
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                <div className="p-8 text-center bg-indigo-600 text-white relative">
                    <button onClick={onClose} className="absolute right-6 top-6 p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                        <Lock size={40} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-black">Area Terbatas</h3>
                    <p className="text-indigo-100 text-sm mt-1">Masukkan kata sandi admin untuk melanjutkan aksi ini.</p>
                </div>
                <form onSubmit={onConfirm} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <input
                            type="password"
                            placeholder="Kata Sandi"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl font-bold tracking-[0.5em] focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:tracking-normal placeholder:font-medium"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            autoFocus
                        />
                        <button
                            disabled={loadingPassword}
                            type="submit"
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loadingPassword ? (
                                <><Loader2 className="animate-spin" /> Sedang Memeriksa...</>
                            ) : "Buka Akses Sekarang"}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">Sesi berlaku selama 30 menit</p>
                </form>
            </div>
        </div>
    );
};

export default PasswordDialog;
