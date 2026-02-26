import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Globe, Mail, ArrowRight, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
            toast.success('Email reset password telah dikirim!');
        } catch (error: any) {
            const code = error.code;
            if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
                toast.error('Email tidak ditemukan atau tidak valid.');
            } else {
                toast.error('Gagal mengirim email: ' + (error.message || 'Terjadi kesalahan'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">

            {/* ===== HERO ===== */}
            <div className="relative lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col items-center justify-center px-8 pt-12 pb-20 lg:pb-0 lg:py-16 overflow-hidden">
                {/* Pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                            <polygon points="30,2 58,16 58,36 30,50 2,36 2,16" fill="none" stroke="white" strokeWidth="1.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex)" />
                </svg>
                <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-sky-400/20 rounded-full blur-3xl" />

                <div className="relative z-10 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 border border-white/25 rounded-3xl shadow-2xl mb-6 backdrop-blur-sm">
                        <Globe size={38} className="text-white" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
                        Easy<span className="text-blue-200">Sabil</span>
                    </h1>
                    <p className="hidden lg:block text-blue-200/80 text-base max-w-xs mx-auto leading-relaxed">
                        Sistem manajemen data sabil yang mudah dan efisien
                    </p>
                </div>
            </div>

            {/* ===== FORM CARD ===== */}
            <div className="relative lg:w-1/2 bg-white rounded-t-[2.5rem] lg:rounded-none -mt-8 lg:mt-0 z-10 flex items-center justify-center px-6 py-10 lg:px-12 lg:py-0 lg:min-h-screen shadow-[0_-8px_40px_rgba(0,0,0,0.12)] lg:shadow-none">
                <div className="w-full max-w-md">

                    {!sent ? (
                        <>
                            <div className="mb-8">
                                <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-4">
                                    <Mail size={22} className="text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Lupa Password?</h2>
                                <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                                    Masukkan email akunmu, kami akan mengirim link untuk membuat password baru.
                                </p>
                            </div>

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="contoh@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-150 text-sm"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={17} />
                                                Kirim Email Reset
                                                <ArrowRight size={16} className="ml-auto opacity-60" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        /* ── Success state ── */
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <Mail size={28} className="text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Terkirim!</h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-2">
                                Kami sudah mengirim link reset password ke:
                            </p>
                            <p className="font-semibold text-slate-700 text-sm mb-8 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 break-all">
                                {email}
                            </p>
                            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-left">
                                <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Jika tidak ada di inbox, cek <span className="font-semibold">folder Spam / Junk</span> — email reset password kadang masuk ke sana.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Back to login */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400 font-medium">ATAU</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center justify-between w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors group"
                    >
                        <ArrowLeft size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" />
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-700">Kembali ke Login</p>
                        </div>
                        <div className="w-[18px]" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
