import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import toast, { Toaster } from 'react-hot-toast';
import {
    ChevronLeft, ChevronRight, Loader2, Download, Share2,
    X, CheckCircle2, Users, CalendarDays
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Member } from '../types/Member';

dayjs.locale('id');

const CATEGORIES = [
    { id: 'Bapak-Bapak', label: 'Bapak-Bapak', color: 'blue' },
    { id: 'Ibu-Ibu', label: 'Ibu-Ibu', color: 'red' },
    { id: 'Muda/i Laki-laki', label: 'Muda Putra', color: 'indigo' },
    { id: 'Muda/i Perempuan', label: 'Muda Putri', color: 'rose' },
];

export default function MonthlyAttendance() {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [members, setMembers] = useState<Member[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Bapak-Bapak');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedShareGroup, setSelectedShareGroup] = useState<string>('Bapak-Bapak');

    // --- FETCH DATA ---
    const fetchMembers = useCallback(async () => {
        const { data, error } = await supabase
            .from('list_sensus')
            .select('uuid, name, alias, gender, level, is_active, order')
            .eq('is_active', true)
            .order('order', { ascending: true })
            .order('name', { ascending: true });
        if (!error && data) setMembers(data as Member[]);
    }, []);

    const fetchAttendance = useCallback(async () => {
        setIsLoading(true);
        const startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
        const endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');
        const { data, error } = await supabase
            .from('attendance_log')
            .select('member_id, date, status')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);
        
        if (!error && data) {
            const map: Record<string, string> = {};
            data.forEach((log: any) => map[`${log.member_id}-${log.date}`] = log.status);
            setAttendanceMap(map);
        }
        setIsLoading(false);
    }, [currentDate]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);
    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    // --- LOGIC ---
    const scheduleDays = useMemo(() => {
        const daysInMonth = currentDate.daysInMonth();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = currentDate.date(i);
            const dayOfWeek = date.day();
            if (dayOfWeek === 1 || dayOfWeek === 4) {
                days.push({
                    date: i,
                    dayName: date.format('dddd'),
                    shortDay: date.format('dd'),
                    fullDate: date.format('YYYY-MM-DD')
                });
            }
        }
        return days;
    }, [currentDate]);

    const groupedMembers = useMemo(() => {
        const checkLevel = (l: string, t: string[]) => l && t.some(x => x.toLowerCase() === l.toLowerCase());
        return {
            'Bapak-Bapak': members.filter(m => checkLevel(m.level, ['Dewasa', 'Lansia']) && m.gender === 'Laki - Laki'),
            'Ibu-Ibu': members.filter(m => checkLevel(m.level, ['Dewasa', 'Lansia']) && m.gender === 'Perempuan'),
            'Muda/i Laki-laki': members.filter(m => checkLevel(m.level, ['Pra Remaja', 'Remaja', 'Pra Nikah']) && m.gender === 'Laki - Laki'),
            'Muda/i Perempuan': members.filter(m => checkLevel(m.level, ['Pra Remaja', 'Remaja', 'Pra Nikah']) && m.gender === 'Perempuan'),
        };
    }, [members]);

    const handleToggle = async (memberId: string, dateStr: string) => {
        const key = `${memberId}-${dateStr}`;
        const current = attendanceMap[key];
        let next: 'H' | 'I' | 'S' | 'A' | null = null;
        if (!current) next = 'H';
        else if (current === 'H') next = 'I';
        else if (current === 'I') next = 'S';
        else if (current === 'S') next = 'A';

        setAttendanceMap(prev => {
            const n = { ...prev };
            if (next) n[key] = next; else delete n[key];
            return n;
        });

        if (next) await supabase.from('attendance_log').upsert({ member_id: memberId, date: dateStr, status: next }, { onConflict: 'member_id, date' });
        else await supabase.from('attendance_log').delete().match({ member_id: memberId, date: dateStr });
    };

    // --- ACTIONS ---
    const handleExportExcel = () => {
        // @ts-ignore
        const currentMembers = groupedMembers[activeTab] || [];
        const rows = [[`REKAP ${activeTab} - ${currentDate.format('MMM YYYY')}`], [''], ['No', 'Nama', ...scheduleDays.map(d => `${d.shortDay}, ${d.date}`), 'H', 'I', 'S', 'A']];
        currentMembers.forEach((m: any, i: number) => {
            let h = 0, i_ = 0, s = 0, a = 0;
            const stats = scheduleDays.map(d => {
                const st = attendanceMap[`${m.uuid}-${d.fullDate}`];
                if (st === 'H') h++; if (st === 'I') i_++; if (st === 'S') s++; if (st === 'A') a++;
                return st || '';
            });
            rows.push([i + 1, m.name, ...stats, h, i_, s, a]);
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Absensi');
        saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `Absensi_${activeTab}.xlsx`);
        toast.success('Excel Unduh');
    };

    const executeShareWA = () => {
        // @ts-ignore
        const target = groupedMembers[selectedShareGroup] || [];
        let msg = `*ABSENSI PENGAJIAN*\n📂 ${selectedShareGroup}\n🗓 ${currentDate.format('MMM YYYY')}\n---\n`;
        const emo = (s: string) => ({ 'H': '✅', 'I': 'ℹ️', 'S': '🤒', 'A': '❌' }[s] || '➖');
        target.forEach((m: any, i: number) => {
            msg += `${i + 1}. ${m.alias || m.name} : ${scheduleDays.map(d => emo(attendanceMap[`${m.uuid}-${d.fullDate}`] || '')).join('')}\n`;
        });
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        setIsShareModalOpen(false);
    };

    // @ts-ignore
    const currentMembers = groupedMembers[activeTab] || [];
    // @ts-ignore
    const currentConfig = CATEGORIES.find(c => c.id === activeTab);

    return (
        // Padding bottom besar di mobile untuk tombol floating, padding standard di desktop
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-32 md:pb-12">
            <Toaster position="top-center" />

            {/* ================= HEADER AREA ================= */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                
                {/* --- HEADER DESKTOP (Tampilan Web Lama) --- */}
                <div className="hidden md:flex max-w-[100vw] mx-auto px-6 py-4 justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">PENGAJIAN KELOMPOK 1</h1>
                        <p className="text-slate-500 text-sm">Rekap Absensi Senin & Kamis</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronLeft size={20} /></button>
                        <div className="w-40 text-center font-bold text-slate-700 uppercase">{currentDate.format('MMMM YYYY')}</div>
                        <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronRight size={20} /></button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 font-semibold text-sm">
                            <Download size={18} /> Excel
                        </button>
                        <button onClick={() => { setSelectedShareGroup(activeTab); setIsShareModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow-md">
                            <Share2 size={18} /> Share WA
                        </button>
                    </div>
                </div>

                {/* --- HEADER MOBILE (Tampilan Mobile Baru Compact) --- */}
                <div className="flex md:hidden px-4 py-3 flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg bg-${currentConfig?.color}-100 text-${currentConfig?.color}-700`}>
                                <CalendarDays size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-none">Jurnal</h1>
                                <p className="text-xs text-slate-500 font-medium">{currentDate.format('MMMM YYYY')}</p>
                            </div>
                        </div>
                        <div className="flex items-center bg-slate-100 rounded-full p-1">
                            <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="p-2 bg-white rounded-full shadow-sm"><ChevronLeft size={16} /></button>
                            <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="p-2 bg-white rounded-full shadow-sm ml-1"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* --- TABS KATEGORI (Shared) --- */}
                {/* Mobile: Negative margin biar full width. Desktop: Normal container */}
                <div className="md:px-6 px-4 pb-3 md:pb-4 border-t md:border-none pt-2 md:pt-0">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border flex-shrink-0
                                    ${activeTab === cat.id
                                        ? `bg-${cat.color}-600 text-white border-${cat.color}-600 shadow-md`
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                `}
                            >
                                {activeTab === cat.id ? <CheckCircle2 size={16} /> : <Users size={16} />}
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================= CONTENT BODY ================= */}
            <div className="w-full md:px-6 mt-4">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : (
                    <AttendanceTable
                        members={currentMembers}
                        days={scheduleDays}
                        attendanceMap={attendanceMap}
                        onToggle={handleToggle}
                        color={currentConfig?.color}
                    />
                )}
            </div>

            {/* ================= FLOATING ACTIONS (MOBILE ONLY) ================= */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-50 w-full max-w-sm px-4 md:hidden">
                <button onClick={handleExportExcel} className="flex-1 bg-white border border-emerald-200 text-emerald-700 shadow-xl py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                    <Download size={18} /> Excel
                </button>
                <button onClick={() => { setSelectedShareGroup(activeTab); setIsShareModalOpen(true); }} className="flex-[2] bg-emerald-600 text-white shadow-xl py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
                    <Share2 size={18} /> Share WA
                </button>
            </div>

            {/* ================= MODAL SHARE ================= */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-3xl md:rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Share WhatsApp</h3>
                            <button onClick={() => setIsShareModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-2 mb-4">
                            {CATEGORIES.map(c => (
                                <div key={c.id} onClick={() => setSelectedShareGroup(c.id)} className={`p-3 border rounded-xl flex justify-between items-center ${selectedShareGroup === c.id ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-200'}`}>
                                    <span className="font-bold text-sm">{c.label}</span>
                                    {selectedShareGroup === c.id && <CheckCircle2 size={18} />}
                                </div>
                            ))}
                        </div>
                        <button onClick={executeShareWA} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg">Kirim Sekarang</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- HYBRID TABLE COMPONENT ---
const AttendanceTable = ({ members, days, attendanceMap, onToggle, color }: any) => {
    // Style border header sesuai warna kategori
    const borderClass = {
        blue: 'border-blue-500', red: 'border-red-500', indigo: 'border-indigo-500', rose: 'border-rose-500'
    }[color as string] || 'border-slate-500';

    return (
        <div className={`bg-white md:rounded-2xl shadow-sm border-t-4 ${borderClass} overflow-hidden`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-20 shadow-sm">
                        <tr>
                            {/* NO: Hidden di Mobile, Show di Desktop */}
                            <th className="hidden md:table-cell p-3 border-b border-r border-slate-200 text-center w-10 text-xs font-bold">No</th>
                            
                            {/* NAMA: Sticky di Mobile (shadow), Static/Sticky di Desktop */}
                            <th className="sticky left-0 z-30 bg-slate-50 p-3 border-b border-r border-slate-200 w-[140px] md:w-[250px] shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] md:shadow-none">
                                <span className="text-xs font-bold uppercase">Nama Anggota</span>
                            </th>
                            
                            {/* TANGGAL */}
                            {days.map((d: any) => (
                                <th key={d.date} className="p-2 border-b border-slate-200 text-center min-w-[3.5rem] border-r border-slate-100">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] md:text-[9px] uppercase font-bold text-slate-400 mb-0.5">{d.shortDay}</span>
                                        {/* Mobile: Kotak tanggal. Desktop: Teks biasa saja */}
                                        <span className="text-sm font-black text-slate-700 md:text-slate-600 bg-white md:bg-transparent border md:border-none border-slate-200 rounded-lg w-8 h-8 md:w-auto md:h-auto flex items-center justify-center shadow-sm md:shadow-none">
                                            {d.date}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {members.map((m: any, idx: number) => (
                            <tr key={m.uuid} className="group bg-white hover:bg-slate-50">
                                {/* NO: Desktop Only */}
                                <td className="hidden md:table-cell text-center text-xs text-slate-400 font-bold border-r border-slate-100">
                                    {m.order || idx + 1}
                                </td>
                                
                                {/* NAMA: Sticky Mobile */}
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-3 border-r border-slate-100 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.05)] md:shadow-none">
                                    <div className="flex flex-col justify-center h-10 md:h-auto">
                                        <span className="text-sm font-semibold text-slate-700 truncate w-[110px] md:w-auto block">
                                            {m.alias || m.name}
                                        </span>
                                        {/* Mobile Only: Nomor urut di bawah nama */}
                                        <span className="md:hidden text-[10px] text-slate-400">No. {m.order || idx + 1}</span>
                                    </div>
                                </td>

                                {/* CELLS */}
                                {days.map((d: any) => {
                                    const status = attendanceMap[`${m.uuid}-${d.fullDate}`];
                                    
                                    // --- LOGIC TAMPILAN GANDA ---
                                    let mobileContent = <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto" />;
                                    let desktopClass = "md:text-slate-300 md:hover:bg-slate-100";
                                    let desktopText = "-";

                                    if (status === 'H') {
                                        mobileContent = <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shadow-sm mx-auto">H</div>;
                                        desktopClass = "md:bg-emerald-100 md:text-emerald-700 md:font-bold";
                                        desktopText = "H";
                                    } else if (status === 'I') {
                                        mobileContent = <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs shadow-sm mx-auto">I</div>;
                                        desktopClass = "md:bg-amber-100 md:text-amber-700 md:font-bold";
                                        desktopText = "I";
                                    } else if (status === 'S') {
                                        mobileContent = <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs shadow-sm mx-auto">S</div>;
                                        desktopClass = "md:bg-purple-100 md:text-purple-700 md:font-bold";
                                        desktopText = "S";
                                    } else if (status === 'A') {
                                        mobileContent = <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-xs shadow-sm mx-auto">A</div>;
                                        desktopClass = "md:bg-rose-100 md:text-rose-700 md:font-bold";
                                        desktopText = "A";
                                    }

                                    return (
                                        <td
                                            key={d.date}
                                            onClick={() => onToggle(m.uuid, d.fullDate)}
                                            className={`border-r border-slate-50 cursor-pointer select-none transition-colors active:scale-95 text-center ${desktopClass}`}
                                        >
                                            {/* CONTAINER MOBILE: Tinggi, pakai Badge Bulat */}
                                            <div className="md:hidden h-14 flex items-center justify-center">
                                                {mobileContent}
                                            </div>

                                            {/* CONTAINER DESKTOP: Pendek, Full Cell Color (Hidden di Mobile) */}
                                            <div className="hidden md:block py-2">
                                                {desktopText}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};