import { useMemo } from 'react';
import {
    Users, Home, Heart, GraduationCap,
    ArrowUpRight, Copy, Share2,
    CheckCircle2, User
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import { type Familys, type Member } from '../types/Member';

interface DashboardProps {
    members: Member[];
    listFamily: Familys[];
    loading: boolean;
}

export default function Dashboard({ loading, members, listFamily }: DashboardProps) {
    // --- Logic Statistik ---
    const activeMembers = useMemo(() => members.filter(m => m.is_active && !m.is_educate), [members]);
    const total = activeMembers.length || 0;
    const totalKepalaKeluarga = Math.max(0, (listFamily?.length || 0) - 2);

    const totalLaki = activeMembers.filter(m => m.gender === 'Laki - Laki').length;
    const totalPerempuan = activeMembers.filter(m => m.gender === 'Perempuan').length;

    // LOGIC BARU: Grouping Pendidikan dengan Detail Gender
    const statsByLevel = useMemo(() => {
        const stats: Record<string, { total: number; laki: number; perempuan: number }> = {};

        activeMembers.forEach(member => {
            const level = member.level || 'Lainnya';
            if (!stats[level]) {
                stats[level] = { total: 0, laki: 0, perempuan: 0 };
            }

            stats[level].total += 1;

            if (member.gender === 'Laki - Laki') {
                stats[level].laki += 1;
            } else if (member.gender === 'Perempuan') {
                stats[level].perempuan += 1;
            }
        });

        // Mengubah object ke array dan urutkan dari total terbanyak
        return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
    }, [activeMembers]);

    const totalDuda = members.filter(m => m.marriage_status === 'Duda').length;
    const totalJanda = members.filter(m => m.marriage_status === 'Janda').length;
    const totalDuafa = members.filter(m => m.is_duafa).length;
    const totalBinaan = members.filter(m => m.is_educate).length;

    // --- Actions ---
    const handleCopy = () => {
        copy(`📊 Update Data: Total ${total} Anggota, ${totalKepalaKeluarga} KK.`);
        alert('Ringkasan disalin!');
    };

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Statistik</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Ringkasan data demografi anggota dan keluarga.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm"
                    >
                        <Copy size={16} /> Salin Ringkasan
                    </button>
                    <button
                        onClick={() => window.open(`https://wa.me/?text=Cek Dashboard Total ${total}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium shadow-md shadow-indigo-200"
                    >
                        <Share2 size={16} /> Bagikan
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                {/* 1. Hero Card: Total & Gender Global */}
                <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                        <Users size={180} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Users size={20} />
                            </div>
                            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Anggota Aktif</span>
                        </div>
                        <h2 className="text-5xl font-bold text-slate-900 mt-2">{total} <span className="text-xl text-slate-400 font-medium">Orang</span></h2>
                    </div>

                    <div className="relative z-10 mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                            <span className="flex items-center gap-1"><User size={14} className="text-sky-500" /> Laki-laki: {totalLaki}</span>
                            <span className="flex items-center gap-1">Perempuan: {totalPerempuan} <User size={14} className="text-pink-500" /></span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                            <div style={{ width: `${(totalLaki / total) * 100}%` }} className="bg-sky-500 h-full"></div>
                            <div style={{ width: `${(totalPerempuan / total) * 100}%` }} className="bg-pink-500 h-full"></div>
                        </div>
                    </div>
                </div>

                {/* 2. Kepala Keluarga */}
                <div className="col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Home size={20} />
                        </div>
                        <span className="text-sm font-medium text-slate-500">Kepala Keluarga</span>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{totalKepalaKeluarga}</p>
                    <p className="text-xs text-slate-400 mt-2">Terdaftar dalam KK</p>
                </div>

                {/* 3. Duafa Stats */}
                <div className="col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-lg">
                                <Heart size={20} />
                            </div>
                            <span className="text-sm font-medium text-slate-500">Duafa</span>
                        </div>
                        <span className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded">Penerima</span>
                    </div>
                    <p className="text-4xl font-bold text-slate-800">{totalDuafa}</p>
                    <p className="text-xs text-slate-400 mt-2">Anggota terverifikasi</p>
                </div>

                {/* 4. Marital Status */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 rounded-2xl p-5 text-white flex flex-col justify-between">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                        <p className="text-lg font-medium text-slate-200 mb-2">Janda</p>
                        <p className="text-4xl font-bold">{totalJanda}</p>
                    </div>
                    <div className="bg-slate-700 rounded-2xl p-5 text-white flex flex-col justify-between">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                        <p className="text-lg font-medium text-slate-200 mb-2">Duda</p>
                        <p className="text-4xl font-bold">{totalDuda}</p>
                    </div>
                </div>

                {/* 5. Anggota Binaan */}
                <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-md shadow-blue-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1 opacity-90">
                            <CheckCircle2 size={18} />
                            <span className="font-medium">Anggota Binaan</span>
                        </div>
                        <p className="text-3xl font-bold">{totalBinaan} <span className="text-lg font-normal opacity-80">Orang</span></p>
                        <p className="text-xs opacity-75 mt-1">Sedang dalam masa pendidikan</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                        <ArrowUpRight size={24} className="text-white" />
                    </div>
                </div>

                {/* --- 6. PENDIDIKAN LENGKAP DENGAN GENDER --- */}
                <div className="col-span-1 md:col-span-2 xl:col-span-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                            <GraduationCap className="text-indigo-600" size={24} /> Distribusi Pendidikan
                        </h3>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500"></div> Laki-laki</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"></div> Perempuan</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {statsByLevel.map(([level, data], idx) => (
                            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-indigo-200 transition-colors">
                                {/* Header Card */}
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-semibold text-slate-700">{level}</span>
                                    <span className="bg-white px-2 py-1 rounded-md text-sm font-bold text-slate-800 shadow-sm border border-slate-100">
                                        Total: {data.total}
                                    </span>
                                </div>

                                {/* Stacked Bar Visual */}
                                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex mb-2">
                                    <div
                                        className="bg-sky-500 h-full hover:bg-sky-400 transition-colors relative group/tooltip"
                                        style={{ width: `${data.total > 0 ? (data.laki / data.total) * 100 : 0}%` }}
                                    ></div>
                                    <div
                                        className="bg-pink-500 h-full hover:bg-pink-400 transition-colors relative group/tooltip"
                                        style={{ width: `${data.total > 0 ? (data.perempuan / data.total) * 100 : 0}%` }}
                                    ></div>
                                </div>

                                {/* Detail Angka Gender */}
                                <div className="flex justify-between text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1 text-sky-700">
                                        <User size={12} /> {data.laki} L
                                    </span>
                                    <span className="flex items-center gap-1 text-pink-700">
                                        {data.perempuan} P <User size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="p-6 bg-slate-50 min-h-screen animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 h-64 bg-slate-200 rounded-2xl"></div>
                <div className="h-40 bg-slate-200 rounded-2xl"></div>
                <div className="h-40 bg-slate-200 rounded-2xl"></div>
                <div className="md:col-span-4 h-64 bg-slate-200 rounded-2xl"></div>
            </div>
        </div>
    );
}