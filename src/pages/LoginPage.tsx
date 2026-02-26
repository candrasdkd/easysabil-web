import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Globe } from 'lucide-react';

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
        <div className="min-h-screen flex">
            {/* Left Panel — Decorative with floating animations */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden flex-col items-center justify-center p-12 animate-fade-in">
                {/* Floating circles */}
                <div className="absolute top-[-80px] right-[-80px] w-96 h-96 bg-white/5 rounded-full animate-float-a" />
                <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 bg-white/8 rounded-full animate-float-b" />
                <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-white/5 rounded-full animate-float-c" />
                <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/10 rounded-full animate-float-a" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/15 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 animate-pulse-slow animate-fade-up">
                        <Globe size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight animate-fade-up-delay1">
                        Easy<span className="text-violet-200">Sabil</span>
                    </h1>
                    <p className="text-indigo-200 text-lg max-w-xs leading-relaxed animate-fade-up-delay2">
                        Sistem manajemen data sabil yang mudah dan efisien.
                    </p>

                    <div className="mt-12 grid grid-cols-3 gap-4 text-center animate-fade-up-delay3">
                        {[
                            { label: 'Kelompok', value: '5+' },
                            { label: 'Anggota', value: '100+' },
                            { label: 'Data Terkelola', value: '∞' },
                        ].map(stat => (
                            <div key={stat.label} className="bg-white/10 rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-indigo-300 text-xs mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10 justify-center animate-fade-up">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Globe size={22} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold text-slate-800">
                            Easy<span className="text-indigo-600">Sabil</span>
                        </span>
                    </div>

                    <div className="mb-8 animate-fade-up">
                        <h2 className="text-3xl font-bold text-slate-900">Selamat datang 👋</h2>
                        <p className="text-slate-500 mt-2">Masuk untuk mengakses sistem EasySabil</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="animate-fade-up-delay1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                required
                                placeholder="contoh@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="animate-fade-up-delay2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all pr-12"
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

                        <div className="pt-1 animate-fade-up-delay3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all duration-150"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn size={18} />
                                        Masuk
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6 animate-fade-up-delay4">
                        Belum punya akun?{' '}
                        <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
