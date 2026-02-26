import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Globe, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success("Login berhasil!");
            navigate('/');
        } catch (error: any) {
            const code = error.code;
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
                toast.error("Email atau password salah.");
            } else {
                toast.error("Gagal login: " + (error.message || 'Terjadi kesalahan'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">

            {/* ===== TOP / LEFT HERO ===== */}
            <div className="relative lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col items-center justify-center px-8 pt-12 pb-20 lg:pb-0 lg:py-16 overflow-hidden">

                {/* Geometric pattern overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                            <polygon points="30,2 58,16 58,36 30,50 2,36 2,16" fill="none" stroke="white" strokeWidth="1.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex)" />
                </svg>

                {/* Glow blobs */}
                <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-sky-400/20 rounded-full blur-3xl" />

                {/* Hero content */}
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

                    {/* Stats — desktop only */}
                    <div className="hidden lg:flex gap-6 mt-12 justify-center">
                        {[['5+', 'Kelompok'], ['100+', 'Anggota'], ['∞', 'Data']].map(([val, label]) => (
                            <div key={label} className="text-center">
                                <div className="text-3xl font-bold text-white">{val}</div>
                                <div className="text-blue-300 text-sm mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>


                </div>
            </div>

            {/* ===== BOTTOM / RIGHT FORM CARD ===== */}
            {/* On mobile: rounded top card overlapping hero */}
            <div className="relative lg:w-1/2 bg-white rounded-t-[2.5rem] lg:rounded-none -mt-8 lg:mt-0 z-10 flex items-center justify-center px-6 py-10 lg:px-12 lg:py-0 lg:min-h-screen shadow-[0_-8px_40px_rgba(0,0,0,0.12)] lg:shadow-none">

                <div className="w-full max-w-md">

                    {/* Greeting */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900">Selamat datang 👋</h2>
                        <p className="text-slate-400 text-sm mt-1.5">Masuk untuk mengakses sistem EasySabil</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        {/* Email */}
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

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
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
                                        <LogIn size={18} />
                                        Masuk ke Akun
                                        <ArrowRight size={16} className="ml-auto opacity-60" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400 font-medium">ATAU</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Register link as a button-style block */}
                    <Link
                        to="/register"
                        className="flex items-center justify-between w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Belum punya akun?</p>
                            <p className="text-xs text-slate-400 mt-0.5">Daftar sekarang, gratis</p>
                        </div>
                        <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
