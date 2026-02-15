import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Loader2, Download, Share2, X, MessageCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Member } from '../types/Member';

dayjs.locale('id');

export default function MonthlyAttendance() {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [members, setMembers] = useState<Member[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    // --- STATE UNTUK SHARE WA ---
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedShareGroup, setSelectedShareGroup] = useState<string>('Dewasa Laki-laki');

    // --- 1. FETCH MEMBER ---
    const fetchMembers = useCallback(async () => {
        const { data, error } = await supabase
            .from('list_sensus')
            .select('uuid, name, alias, gender, level, is_active, order')
            .eq('is_active', true)
            .order('order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            toast.error('Gagal ambil data member');
            return;
        }
        if (data) setMembers(data as Member[]);
    }, []);

    // --- 2. FETCH ABSENSI ---
    const fetchAttendance = useCallback(async () => {
        setIsLoading(true);
        const startOfMonth = currentDate.startOf('month').format('YYYY-MM-DD');
        const endOfMonth = currentDate.endOf('month').format('YYYY-MM-DD');

        const { data, error } = await supabase
            .from('attendance_log')
            .select('member_id, date, status')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        if (error) {
            toast.error('Gagal load absensi');
            setIsLoading(false);
            return;
        }

        const map: Record<string, string> = {};
        data?.forEach((log: any) => {
            map[`${log.member_id}-${log.date}`] = log.status;
        });
        setAttendanceMap(map);
        setIsLoading(false);
    }, [currentDate]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);
    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    // --- 3. LOGIC HARI (Senin & Kamis) ---
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

    // --- 4. GROUPING MEMBER ---
    const groupedMembers = useMemo(() => {
        const DEWASA_LEVELS = ['Dewasa', 'Lansia'];
        const MUDA_LEVELS = ['Pra Remaja', 'Remaja', 'Pra Nikah'];
        const checkLevel = (memberLevel: string, targetLevels: string[]) =>
            memberLevel && targetLevels.some(l => l.toLowerCase() === memberLevel.toLowerCase());

        return {
            'Dewasa Laki-laki': members.filter(m => checkLevel(m.level, DEWASA_LEVELS) && m.gender === 'Laki - Laki'),
            'Dewasa Perempuan': members.filter(m => checkLevel(m.level, DEWASA_LEVELS) && m.gender === 'Perempuan'),
            'Muda/i Laki-laki': members.filter(m => checkLevel(m.level, MUDA_LEVELS) && m.gender === 'Laki - Laki'),
            'Muda/i Perempuan': members.filter(m => checkLevel(m.level, MUDA_LEVELS) && m.gender === 'Perempuan'),
        };
    }, [members]);

    // --- 5. HANDLE SIMPAN (Toggle Cycle: H -> I -> S -> A) ---
    const handleToggle = async (memberId: string, dateStr: string) => {
        const key = `${memberId}-${dateStr}`;
        const currentStatus = attendanceMap[key];
        let nextStatus: 'H' | 'I' | 'S' | 'A' | null = null;

        if (!currentStatus) nextStatus = 'H';
        else if (currentStatus === 'H') nextStatus = 'I';
        else if (currentStatus === 'I') nextStatus = 'S'; // Tambah SAKIT
        else if (currentStatus === 'S') nextStatus = 'A'; // Tambah ALFA setelah SAKIT
        else nextStatus = null;

        setAttendanceMap(prev => {
            const next = { ...prev };
            if (nextStatus) next[key] = nextStatus; else delete next[key];
            return next;
        });

        try {
            if (nextStatus) {
                await supabase.from('attendance_log').upsert(
                    { member_id: memberId, date: dateStr, status: nextStatus },
                    { onConflict: 'member_id, date' }
                );
            } else {
                await supabase.from('attendance_log').delete().match({ member_id: memberId, date: dateStr });
            }
        } catch (err) {
            toast.error('Gagal menyimpan');
        }
    };

    // --- 6. EXPORT EXCEL ---
    const handleExportExcel = () => {
        const toastId = toast.loading('Membuat Excel...');
        const wb = XLSX.utils.book_new();
        const rows: any[][] = [];

        rows.push([`REKAP ABSENSI BULAN ${currentDate.format('MMMM YYYY').toUpperCase()}`]);
        rows.push(['']);

        Object.entries(groupedMembers).forEach(([groupName, groupData]) => {
            if (groupData.length === 0) return;

            rows.push([groupName.toUpperCase()]);
            // Tambah Header S (Sakit)
            const headers = ['No', 'Nama', ...scheduleDays.map(d => `${d.shortDay}, ${d.date}`), 'H', 'I', 'S', 'A'];
            rows.push(headers);

            groupData.forEach((m, idx) => {
                let h = 0, i = 0, s = 0, a = 0;
                const dailyStatuses = scheduleDays.map(d => {
                    const status = attendanceMap[`${m.uuid}-${d.fullDate}`] || '';
                    if (status === 'H') h++;
                    if (status === 'I') i++;
                    if (status === 'S') s++; // Hitung Sakit
                    if (status === 'A') a++;
                    return status;
                });
                rows.push([m.order || idx + 1, m.name, ...dailyStatuses, h, i, s, a]);
            });
            rows.push(['']);
            rows.push(['']);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wscols = [{ wch: 5 }, { wch: 30 }];
        scheduleDays.forEach(() => wscols.push({ wch: 8 }));
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');
        const fileName = `Absensi_${currentDate.format('MM_YYYY')}.xlsx`;
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
        toast.success('Excel berhasil diunduh', { id: toastId });
    };

    // --- 7. SHARE WHATSAPP LOGIC (FIXED EMOJI) ---
    const executeShareWA = () => {
        // @ts-ignore
        const targetMembers = groupedMembers[selectedShareGroup] || [];

        if (targetMembers.length === 0) {
            toast.error('Tidak ada data anggota di grup ini');
            return;
        }

        const monthName = currentDate.format('MMMM YYYY');

        // Gunakan \n untuk enter, jangan pakai spasi aneh-aneh
        let message = `*JURNAL KEGIATAN*\n`;
        message += `📂 Kelompok: ${selectedShareGroup.toUpperCase()}\n`;
        message += `🗓 Periode: ${monthName}\n`;
        message += `-----------------------------\n`;

        const getEmoji = (status: string) => {
            switch (status) {
                case 'H': return '✅';
                case 'I': return 'ℹ️';
                case 'S': return '🤒';
                default: return '❌';
            }
        };

        targetMembers.forEach((m: Member, idx: number) => {
            const statusRow = scheduleDays.map(d => {
                const status = attendanceMap[`${m.uuid}-${d.fullDate}`];
                return getEmoji(status || '');
            });

            // Tambahkan baris per member
            message += `${m.order || idx + 1}. ${m.alias || m.name} :  ${statusRow.join(' ')}\n`;
        });

        message += `-----------------------------\n`;
        message += `_Dicetak oleh Sistem EasySabil_`;

        // --- PERBAIKAN DI SINI ---
        // 1. Encode text agar emoji aman
        const encodedMsg = encodeURIComponent(message);

        // 2. Gunakan api.whatsapp.com (bukan wa.me) untuk support emoji lebih baik
        // 3. Gunakan window.open dengan target _blank
        const waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
        window.open(waUrl, '_blank');

        setIsShareModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
            <Toaster position="top-center" />

            <div className="max-w-[100vw] mx-auto space-y-6">
                {/* Header Control */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4 sticky top-0 z-40">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Jurnal Kegiatan</h1>
                        <p className="text-slate-500 text-xs">Rekap Hari Senin & Kamis</p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="p-2 hover:bg-white rounded-md transition"><ChevronLeft size={20} /></button>
                        <div className="w-40 text-center font-bold text-slate-700 uppercase">
                            {currentDate.format('MMMM YYYY')}
                        </div>
                        <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="p-2 hover:bg-white rounded-md transition"><ChevronRight size={20} /></button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={handleExportExcel}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm text-sm font-medium"
                        >
                            <Download size={16} /> Excel
                        </button>
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow-sm text-sm font-medium"
                        >
                            <Share2 size={16} /> Share WA
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
                ) : (
                    <div className="space-y-8 pb-20">
                        {/* Render Tables */}
                        <AttendanceTable title="KELOMPOK DEWASA LAKI-LAKI" members={groupedMembers['Dewasa Laki-laki']} days={scheduleDays} attendanceMap={attendanceMap} onToggle={handleToggle} color="blue" />
                        <AttendanceTable title="KELOMPOK DEWASA PEREMPUAN" members={groupedMembers['Dewasa Perempuan']} days={scheduleDays} attendanceMap={attendanceMap} onToggle={handleToggle} color="pink" />
                        <AttendanceTable title="KELOMPOK MUDA/I LAKI-LAKI" members={groupedMembers['Muda/i Laki-laki']} days={scheduleDays} attendanceMap={attendanceMap} onToggle={handleToggle} color="indigo" />
                        <AttendanceTable title="KELOMPOK MUDA/I PEREMPUAN" members={groupedMembers['Muda/i Perempuan']} days={scheduleDays} attendanceMap={attendanceMap} onToggle={handleToggle} color="rose" />
                    </div>
                )}
            </div>

            {/* --- MODAL PILIH SHARE GRUP --- */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Share2 size={18} className="text-green-600" /> Share ke WhatsApp
                            </h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Pilih Kelompok:</label>
                            <div className="space-y-2">
                                {Object.keys(groupedMembers).map((groupName) => (
                                    <label
                                        key={groupName}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                                            ${selectedShareGroup === groupName
                                                ? 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500'
                                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="shareGroup"
                                                value={groupName}
                                                checked={selectedShareGroup === groupName}
                                                onChange={(e) => setSelectedShareGroup(e.target.value)}
                                                className="accent-green-600 w-4 h-4"
                                            />
                                            <span className="font-medium text-sm">{groupName}</span>
                                        </div>
                                        {/* @ts-ignore */}
                                        <span className="text-xs bg-white px-2 py-1 rounded border text-slate-400 font-mono">{groupedMembers[groupName].length} Org</span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-6 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600">
                                <p className="font-bold mb-1">Keterangan Emoji:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    <span>✅ = Hadir (H)</span>
                                    <span>❌ = Alfa (A)</span>
                                    <span>ℹ️ = Izin (I)</span>
                                    <span>🤒 = Sakit (S)</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={executeShareWA}
                                className="flex-1 px-4 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={18} /> Kirim WA
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// --- SUB-COMPONENT: TABLE ---
const AttendanceTable = ({ title, members, days, attendanceMap, onToggle, color }: any) => {
    if (members.length === 0) return null;

    const theme = {
        blue: 'border-blue-600',
        pink: 'border-pink-500',
        indigo: 'border-indigo-500',
        rose: 'border-rose-400'
    }[color as string] || 'border-slate-500';

    const headerColor = {
        blue: 'bg-blue-50 text-blue-800',
        pink: 'bg-pink-50 text-pink-800',
        indigo: 'bg-indigo-50 text-indigo-800',
        rose: 'bg-rose-50 text-rose-800'
    }[color as string] || 'bg-slate-50';

    return (
        <div className={`bg-white rounded-xl shadow-sm border-t-4 ${theme} overflow-hidden`}>
            <div className={`p-3 border-b border-slate-200 flex justify-between ${headerColor}`}>
                <h3 className="font-bold text-sm">{title}</h3>
                <span className="text-xs bg-white/60 px-2 py-0.5 rounded font-bold border border-black/5">{members.length} Anggota</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="sticky left-0 z-30 bg-slate-100 p-3 border-b border-r min-w-[40px] text-center">No</th>
                            <th className="sticky left-[40px] z-30 bg-slate-100 p-3 border-b border-r min-w-[200px]">Nama</th>
                            {days.map((d: any) => (
                                <th key={d.date} className="p-2 border-b text-center min-w-[50px] border-r border-slate-200/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] opacity-60 font-medium">{d.shortDay}</span>
                                        <span className="text-sm font-bold">{d.date}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="sticky right-0 z-30 bg-slate-100 p-3 border-b border-l min-w-[80px] text-center">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {members.map((m: any, idx: number) => {
                            let h = 0, i = 0, s = 0, a = 0;
                            return (
                                <tr key={m.uuid} className="hover:bg-slate-50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white p-3 border-r text-center font-medium text-slate-500">{m.order || idx + 1}</td>
                                    <td className="sticky left-[40px] z-10 bg-white p-3 border-r font-medium text-slate-700 whitespace-nowrap">{m.alias || m.name}</td>
                                    {days.map((d: any) => {
                                        const status = attendanceMap[`${m.uuid}-${d.fullDate}`];
                                        if (status === 'H') h++;
                                        if (status === 'I') i++;
                                        if (status === 'S') s++;
                                        if (status === 'A') a++;

                                        let bgClass = '';
                                        if (status === 'H') bgClass = 'bg-emerald-100 text-emerald-700 font-bold';
                                        if (status === 'I') bgClass = 'bg-amber-100 text-amber-700 font-bold';
                                        if (status === 'S') bgClass = 'bg-purple-100 text-purple-700 font-bold'; // Warna Ungu buat Sakit
                                        if (status === 'A') bgClass = 'bg-rose-100 text-rose-700 font-bold';

                                        return (
                                            <td key={d.date} onClick={() => onToggle(m.uuid, d.fullDate)} className={`border-r border-slate-100 text-center cursor-pointer select-none hover:brightness-95 ${bgClass}`}>
                                                {status}
                                            </td>
                                        )
                                    })}
                                    <td className="sticky right-0 z-10 bg-slate-50/80 p-2 border-l text-center">
                                        <div className="flex gap-1 justify-center text-[10px]">
                                            {h > 0 && <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 w-5 h-5 flex items-center justify-center rounded font-bold" title="Hadir">{h}</span>}
                                            {i > 0 && <span className="bg-amber-100 border border-amber-200 text-amber-700 w-5 h-5 flex items-center justify-center rounded font-bold" title="Izin">{i}</span>}
                                            {s > 0 && <span className="bg-purple-100 border border-purple-200 text-purple-700 w-5 h-5 flex items-center justify-center rounded font-bold" title="Sakit">{s}</span>}
                                            {a > 0 && <span className="bg-rose-100 border border-rose-200 text-rose-700 w-5 h-5 flex items-center justify-center rounded font-bold" title="Alfa">{a}</span>}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};