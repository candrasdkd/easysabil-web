import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/client';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus, Globe, ChevronDown, ArrowRight, CheckCircle2 } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 2, label: 'Pengurus Desa' },
    { value: 3, label: 'Pengurus Kelompok' },
    { value: 4, label: 'Pengurus Muda/i Desa' },
    { value: 5, label: 'Pengurus Muda/i Kelompok' },
];

const KELOMPOK_OPTIONS = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5'];

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [status, setStatus] = useState<number | ''>('');
    const [kelompok, setKelompok] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Status yang NOT butuh pilih kelompok
    const needsKelompok = status === 3 || status === 5;

    const handleStatusChange = (val: number) => {
        setStatus(val);
        // Reset kelompok kalau tidak diperlukan
        if (val === 2 || val === 4) setKelompok('');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { toast.error("Password tidak cocok!"); return; }
        if (status === '') { toast.error("Silakan pilih status!"); return; }
        if (needsKelompok && !kelompok) { toast.error("Silakan pilih kelompok!"); return; }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid, email,
                status: Number(status), kelompok: kelompok || '',
                isActive: false, createdAt: new Date()
            });
            toast.success("Registrasi berhasil! Menunggu persetujuan admin.");
            navigate('/login');
        } catch (error: any) {
            toast.error(error.message || 'Gagal mendaftar');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-sm";

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">

            {/* ===== TOP / LEFT HERO ===== */}
            <div className="relative lg:w-2/5 bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col items-center justify-center px-8 pt-12 pb-20 lg:pb-0 lg:py-16 overflow-hidden">

                {/* Hex pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="hex2" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
                            <polygon points="30,2 58,16 58,36 30,50 2,36 2,16" fill="none" stroke="white" strokeWidth="1.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex2)" />
                </svg>

                {/* Glow */}
                <div className="absolute top-[-60px] right-[-60px] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48 bg-sky-400/20 rounded-full blur-3xl" />

                {/* Hero content */}
                <div className="relative z-10 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 border border-white/25 rounded-2xl shadow-xl mb-5 backdrop-blur-sm">
                        <Globe size={30} className="text-white" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2">
                        Easy<span className="text-blue-200">Sabil</span>
                    </h1>
                    <p className="hidden lg:block text-blue-200/80 text-sm max-w-[220px] mx-auto leading-relaxed">
                        Bergabunglah dan kelola data sabil bersama kami
                    </p>

                    {/* Feature list — desktop only */}
                    <div className="hidden lg:flex flex-col gap-3 mt-10 text-left">
                        {[
                            'Data anggota terstruktur & mudah dicari',
                            'Manajemen per kelompok & pengurus',
                            'Aktivasi akun oleh admin untuk keamanan',
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3">
                                <CheckCircle2 size={16} className="text-blue-300 flex-shrink-0 mt-0.5" />
                                <span className="text-blue-100/80 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>


                </div>
            </div>

            {/* ===== FORM CARD ===== */}
            <div className="relative lg:w-3/5 bg-white rounded-t-[2.5rem] lg:rounded-none -mt-8 lg:mt-0 z-10 flex items-center justify-center px-6 py-8 lg:px-12 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] lg:shadow-none overflow-y-auto">

                <div className="w-full max-w-md py-2">

                    <div className="mb-7">
                        <h2 className="text-2xl font-bold text-slate-900">Buat Akun Baru ✨</h2>
                        <p className="text-slate-400 text-sm mt-1.5">Isi data di bawah untuk mendaftar ke EasySabil</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleRegister}>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                            <input type="email" required placeholder="contoh@email.com" value={email}
                                onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                        </div>

                        {/* Password row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} required minLength={6}
                                        placeholder="••••••••" value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={inputClass + " pr-10"} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Konfirmasi</label>
                                <div className="relative">
                                    <input type={showConfirm ? 'text' : 'password'} required minLength={6}
                                        placeholder="••••••••" value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={inputClass + " pr-10"} />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status Pengurus</label>
                            <div className="relative">
                                <select required value={status} onChange={(e) => handleStatusChange(Number(e.target.value))}
                                    className={inputClass + " appearance-none pr-10"}>
                                    <option value="" disabled>Pilih Status</option>
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Kelompok — hanya tampil untuk Pengurus Kelompok & Muda/i Kelompok */}
                        {needsKelompok && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Kelompok</label>
                            <div className="relative">
                                <select required value={kelompok} onChange={(e) => setKelompok(e.target.value)}
                                    className={inputClass + " appearance-none pr-10"}>
                                    <option value="" disabled>Pilih Kelompok</option>
                                    {KELOMPOK_OPTIONS.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        )}

                        {/* Submit */}
                        <div className="pt-2">
                            <button type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-150 text-sm">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        Buat Akun Sekarang
                                        <ArrowRight size={16} className="ml-auto opacity-60" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-5">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400 font-medium">SUDAH PUNYA AKUN?</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    {/* Login block link */}
                    <Link
                        to="/login"
                        className="flex items-center justify-between w-full px-5 py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-colors group"
                    >
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Masuk ke akun</p>
                            <p className="text-xs text-slate-400 mt-0.5">Login dengan email & password</p>
                        </div>
                        <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </Link>

                    {/* Info note */}
                    <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
                        Akun baru memerlukan persetujuan admin sebelum bisa digunakan
                    </p>
                </div>
            </div>
        </div>
    );
}
