import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    type FieldValue,
    type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import toast from 'react-hot-toast';
import {
    Loader2, Share2,
    X, Users, CalendarDays, FileSpreadsheet,
    FileText, Calendar as CalendarIcon, AlertCircle, Search, MessageSquare,
    Filter, ChevronDown, ChevronUp, Check, Clock, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useRoleMembersStore } from '../store/membersStore';
import { useAuth } from '../contexts/auth';
import { logAudit } from '../utils/auditLogger';
import { getKelompokSlug } from '../constants/mudaMudiOptions';
import CustomDatePicker from './CustomDatePicker';

dayjs.locale('id');

export interface SessionRecord {
    status: 'H' | 'I' | 'S' | 'A';
    note?: string;
    time?: string;
}

export interface AttendanceSession {
    date: string;
    kelompok: string;
    day_label: string;
    records: Record<string, SessionRecord>;
    created_at?: Timestamp;
    created_by?: string;
    updated_at?: Timestamp;
    updated_by?: string;
}

type SortMode = 'order' | 'time_desc' | 'time_asc' | 'name';

interface AttendanceSessionPayload {
    date: string;
    kelompok: string;
    day_label: string;
    records: Record<string, SessionRecord>;
    updated_at: FieldValue;
    updated_by: string;
    created_at?: FieldValue;
    created_by?: string;
}

export default function AttendanceLog() {
    const { profile } = useAuth();
    const { members, fetchByRole } = useRoleMembersStore();

    // Mode tab: 'input' | 'rekap'
    const [mode, setMode] = useState<'input' | 'rekap'>('input');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showFilters, setShowFilters] = useState<boolean>(false);

    // --- STATE INPUT HARIAN ---
    const [inputDate, setInputDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [selectedKelompok, setSelectedKelompok] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<string>('SEMUA');
    const [selectedLevel, setSelectedLevel] = useState<string>('SEMUA');
    const [availableKelompoks, setAvailableKelompoks] = useState<string[]>([]);
    const [recordsMap, setRecordsMap] = useState<Record<string, 'H' | 'I' | 'S' | 'A'>>({});
    const [notesMap, setNotesMap] = useState<Record<string, string>>({});
    const [timesMap, setTimesMap] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState<SortMode>('order');
    const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [sessionDocExists, setSessionDocExists] = useState<boolean>(false);

    const noteDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // --- STATE REKAP SESSIONS & SUMMARIES ---
    const [rekapStartDate, setRekapStartDate] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [rekapEndDate, setRekapEndDate] = useState<string>(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [rekapKelompok, setRekapKelompok] = useState<string>('SEMUA');
    const [rekapGender, setRekapGender] = useState<string>('SEMUA');
    const [rekapLevel, setRekapLevel] = useState<string>('SEMUA');
    const [isRekapLoading, setIsRekapLoading] = useState<boolean>(false);

    const [fetchedSessions, setFetchedSessions] = useState<AttendanceSession[]>([]);
    const [selectedSessionDates, setSelectedSessionDates] = useState<string[]>([]);

    const [overallSummary, setOverallSummary] = useState<{
        totalMembers: number;
        totalSessions: number;
        totalExpected: number;
        H: number;
        I: number;
        S: number;
        IS: number;
        A: number;
        pctHadir: number;
        pctIzinSakit: number;
        pctAlfa: number;
    }>({
        totalMembers: 0,
        totalSessions: 0,
        totalExpected: 0,
        H: 0,
        I: 0,
        S: 0,
        IS: 0,
        A: 0,
        pctHadir: 0,
        pctIzinSakit: 0,
        pctAlfa: 0
    });

    const [levelSummaries, setLevelSummaries] = useState<Array<{
        level: string;
        totalMembers: number;
        totalExpected: number;
        H: number;
        I: number;
        S: number;
        IS: number;
        A: number;
        pctHadir: number;
        pctIzinSakit: number;
        pctAlfa: number;
    }>>([]);

    const [rekapData, setRekapData] = useState<Array<{
        memberId: string;
        name: string;
        alias: string;
        kelompok: string;
        level: string;
        gender: string;
        order: number;
        H: number;
        I: number;
        S: number;
        A: number;
        totalScheduled: number;
        percentage: number;
    }>>([]);
    const [totalScheduledDays, setTotalScheduledDays] = useState<number>(0);

    // Modal Share WA
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Initial Fetch Members based on logged in user role
    useEffect(() => {
        if (profile) {
            fetchByRole(profile);
        }
    }, [profile, fetchByRole]);

    // Available Level Options for current user status
    const availableLevelOptions = useMemo(() => {
        if (profile?.status === 4 || profile?.status === 5) {
            return ['Pra Remaja', 'Remaja', 'Pra Nikah'];
        }
        return ['Cabe Rawit', 'Pra Remaja', 'Remaja', 'Pra Nikah', 'Dewasa', 'Lansia'];
    }, [profile]);

    // Active Filter Count calculation
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (mode === 'input') {
            if (selectedGender !== 'SEMUA') count++;
            if (selectedLevel !== 'SEMUA') count++;
            if (selectedKelompok && !(profile && (profile.status === 3 || profile.status === 5))) count++;
        } else {
            if (rekapGender !== 'SEMUA') count++;
            if (rekapLevel !== 'SEMUA') count++;
            if (rekapKelompok !== 'SEMUA' && !(profile && (profile.status === 3 || profile.status === 5))) count++;
        }
        return count;
    }, [mode, selectedGender, selectedLevel, selectedKelompok, rekapGender, rekapLevel, rekapKelompok, profile]);

    // Populate Available Kelompoks from members data
    useEffect(() => {
        if (members && members.length > 0) {
            const list = Array.from(new Set(members.map(m => m.kelompok).filter(Boolean))).sort();
            setAvailableKelompoks(list);

            if (profile) {
                if ((profile.status === 3 || profile.status === 5) && profile.kelompok) {
                    setSelectedKelompok(profile.kelompok);
                    setRekapKelompok(profile.kelompok);
                } else if (!selectedKelompok && list.length > 0) {
                    setSelectedKelompok(list[0]);
                }
            }
        }
    }, [members, profile, selectedKelompok]);

    // --- REALTIME AUTO SAVE FUNCTION ---
    const autoSaveSession = useCallback(async (
        targetRecords: Record<string, 'H' | 'I' | 'S' | 'A'>,
        targetNotes: Record<string, string>,
        targetTimes: Record<string, string>
    ) => {
        if (!selectedKelompok || !inputDate || !profile) return;
        setSaveStatus('saving');

        try {
            const docId = `${inputDate}__${getKelompokSlug(selectedKelompok)}`;
            const sessionRef = doc(db, 'attendance_sessions', docId);
            const dayLabel = dayjs(inputDate).format('dddd');

            const records: Record<string, SessionRecord> = {};
            Object.entries(targetRecords).forEach(([mId, status]) => {
                if (status) {
                    const rec: SessionRecord = { status };
                    if (targetNotes[mId] && targetNotes[mId].trim()) {
                        rec.note = targetNotes[mId].trim();
                    }
                    if (targetTimes[mId]) {
                        rec.time = targetTimes[mId];
                    }
                    records[mId] = rec;
                }
            });

            const sessionPayload: AttendanceSessionPayload = {
                date: inputDate,
                kelompok: selectedKelompok,
                day_label: dayLabel,
                records: records,
                updated_at: serverTimestamp(),
                updated_by: profile.uid,
            };

            if (!sessionDocExists) {
                sessionPayload.created_at = serverTimestamp();
                sessionPayload.created_by = profile.uid;
            }

            await setDoc(sessionRef, sessionPayload, { merge: true });

            if (!sessionDocExists) {
                await logAudit(
                    'CREATE',
                    'ATTENDANCE',
                    docId,
                    `Absensi ${selectedKelompok} - ${inputDate}`,
                    profile,
                    { date: inputDate, kelompok: selectedKelompok, total_records: Object.keys(records).length },
                    `Membuat sesi absensi baru tanggal ${inputDate} untuk ${selectedKelompok}`
                );
            }

            setSessionDocExists(true);
            setSaveStatus('saved');
        } catch (err) {
            console.error("Auto save error:", err);
            setSaveStatus('error');
        }
    }, [selectedKelompok, inputDate, profile, sessionDocExists]);

    // --- 1. FETCH DAILY SESSION FOR INPUT MODE ---
    const fetchSession = useCallback(async () => {
        if (!inputDate || !selectedKelompok) return;
        setIsSessionLoading(true);
        setSaveStatus('idle');

        try {
            const docId = `${inputDate}__${getKelompokSlug(selectedKelompok)}`;
            const sessionRef = doc(db, 'attendance_sessions', docId);
            const snap = await getDoc(sessionRef);

            if (snap.exists()) {
                setSessionDocExists(true);
                const data = snap.data() as AttendanceSession;
                const rMap: Record<string, 'H' | 'I' | 'S' | 'A'> = {};
                const nMap: Record<string, string> = {};
                const tMap: Record<string, string> = {};
                if (data.records) {
                    Object.entries(data.records).forEach(([mId, rec]) => {
                        if (rec && rec.status) {
                            rMap[mId] = rec.status;
                            if (rec.note) nMap[mId] = rec.note;
                            if (rec.time) tMap[mId] = rec.time;
                        }
                    });
                }
                setRecordsMap(rMap);
                setNotesMap(nMap);
                setTimesMap(tMap);
                setSaveStatus('saved');
            } else {
                setSessionDocExists(false);
                setRecordsMap({});
                setNotesMap({});
                setTimesMap({});
                setSaveStatus('idle');
            }
        } catch (err) {
            console.error("Error fetching attendance session:", err);
            toast.error("Gagal memuat data absensi sesi");
        } finally {
            setIsSessionLoading(false);
        }
    }, [inputDate, selectedKelompok]);

    useEffect(() => {
        if (mode === 'input') {
            fetchSession();
        }
    }, [fetchSession, mode]);

    // Filter members for Input Tab
    const filteredInputMembers = useMemo(() => {
        const MUDA_LEVELS = ['pra remaja', 'remaja', 'pra nikah'];

        return members.filter(m => {
            if (m.is_active === false) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = m.name.toLowerCase().includes(q);
                const matchAlias = m.alias ? m.alias.toLowerCase().includes(q) : false;
                if (!matchName && !matchAlias) return false;
            }

            if (profile && (profile.status === 3 || profile.status === 5) && profile.kelompok) {
                if (m.kelompok !== profile.kelompok) return false;
            } else if (selectedKelompok && m.kelompok !== selectedKelompok) {
                return false;
            }

            const l = (m.level || '').toLowerCase().trim();

            if (profile && (profile.status === 4 || profile.status === 5)) {
                if (!MUDA_LEVELS.includes(l)) return false;
            }

            if (selectedGender !== 'SEMUA') {
                if (m.gender !== selectedGender) return false;
            }

            if (selectedLevel !== 'SEMUA') {
                if (l !== selectedLevel.toLowerCase().trim()) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'time_desc') {
                const timeA = timesMap[a.uuid] || '';
                const timeB = timesMap[b.uuid] || '';
                if (timeA && !timeB) return -1;
                if (!timeA && timeB) return 1;
                if (timeA && timeB) {
                    const cmp = timeB.localeCompare(timeA);
                    if (cmp !== 0) return cmp;
                }
                return (a.order || 99) - (b.order || 99);
            } else if (sortBy === 'time_asc') {
                const timeA = timesMap[a.uuid] || '';
                const timeB = timesMap[b.uuid] || '';
                if (timeA && !timeB) return -1;
                if (!timeA && timeB) return 1;
                if (timeA && timeB) {
                    const cmp = timeA.localeCompare(timeB);
                    if (cmp !== 0) return cmp;
                }
                return (a.order || 99) - (b.order || 99);
            } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return (a.order || 99) - (b.order || 99);
        });
    }, [members, selectedKelompok, selectedGender, selectedLevel, profile, searchQuery, sortBy, timesMap]);

    // Instant Toggle Status with Automatic Saving
    const handleToggleMemberStatus = (memberId: string, targetStatus?: 'H' | 'I' | 'S' | 'A') => {
        const currentTime = dayjs().format('HH:mm');

        setRecordsMap(prev => {
            const next = { ...prev };
            const current = next[memberId];
            let newStatus: 'H' | 'I' | 'S' | 'A' | undefined = undefined;

            if (targetStatus) {
                if (current === targetStatus) {
                    delete next[memberId];
                } else {
                    next[memberId] = targetStatus;
                    newStatus = targetStatus;
                }
            } else {
                if (!current) newStatus = 'H';
                else if (current === 'H') newStatus = 'I';
                else if (current === 'I') newStatus = 'S';
                else if (current === 'S') newStatus = 'A';

                if (newStatus) {
                    next[memberId] = newStatus;
                } else {
                    delete next[memberId];
                }
            }

            let nextNotes = notesMap;
            if (newStatus !== 'I' && newStatus !== 'S') {
                if (notesMap[memberId]) {
                    nextNotes = { ...notesMap };
                    delete nextNotes[memberId];
                    setNotesMap(nextNotes);
                }
            }

            const nextTimes = { ...timesMap };
            if (newStatus) {
                nextTimes[memberId] = currentTime;
            } else {
                delete nextTimes[memberId];
            }
            setTimesMap(nextTimes);

            autoSaveSession(next, nextNotes, nextTimes);
            return next;
        });
    };

    // Note Change Handler with Debounced Auto Saving
    const handleNoteChange = (memberId: string, text: string) => {
        const nextNotes = { ...notesMap, [memberId]: text };
        setNotesMap(nextNotes);

        if (noteDebounceTimer.current) {
            clearTimeout(noteDebounceTimer.current);
        }
        noteDebounceTimer.current = setTimeout(() => {
            autoSaveSession(recordsMap, nextNotes, timesMap);
        }, 400);
    };

    // --- 2. REKAP ABSENSI AGGREGATOR ---
    const fetchRekapData = useCallback(async () => {
        if (!rekapStartDate || !rekapEndDate) return;
        setIsRekapLoading(true);

        try {
            const start = dayjs(rekapStartDate);
            const end = dayjs(rekapEndDate);
            if (end.isBefore(start)) {
                toast.error("Tanggal akhir harus setelah tanggal mulai");
                setIsRekapLoading(false);
                return;
            }

            let q = query(
                collection(db, 'attendance_sessions'),
                where('date', '>=', rekapStartDate),
                where('date', '<=', rekapEndDate)
            );

            if (rekapKelompok !== 'SEMUA') {
                q = query(
                    collection(db, 'attendance_sessions'),
                    where('date', '>=', rekapStartDate),
                    where('date', '<=', rekapEndDate),
                    where('kelompok', '==', rekapKelompok)
                );
            }

            const querySnap = await getDocs(q);
            const sessionDocs: AttendanceSession[] = [];
            querySnap.forEach(d => {
                sessionDocs.push(d.data() as AttendanceSession);
            });

            sessionDocs.sort((a, b) => a.date.localeCompare(b.date));
            setFetchedSessions(sessionDocs);

            const allDates = sessionDocs.map(s => s.date);
            setSelectedSessionDates(allDates);
        } catch (err) {
            console.error("Error fetching sessions for rekap:", err);
            toast.error("Gagal memuat data sesi pengajian");
        } finally {
            setIsRekapLoading(false);
        }
    }, [rekapStartDate, rekapEndDate, rekapKelompok]);

    useEffect(() => {
        if (mode === 'rekap') {
            fetchRekapData();
        }
    }, [fetchRekapData, mode]);

    // Recalculate Rekap Summaries (3 Categories: Hadir, Izin&Sakit, Alfa)
    useEffect(() => {
        if (mode !== 'rekap') return;

        const activeSessions = fetchedSessions.filter(s => selectedSessionDates.includes(s.date));
        const totalSessionsCount = activeSessions.length;
        setTotalScheduledDays(totalSessionsCount);

        const MUDA_LEVELS = ['pra remaja', 'remaja', 'pra nikah'];
        const targetMembers = members.filter(m => {
            if (m.is_active === false) return false;

            if (profile && (profile.status === 3 || profile.status === 5) && profile.kelompok) {
                if (m.kelompok !== profile.kelompok) return false;
            } else if (rekapKelompok !== 'SEMUA' && m.kelompok !== rekapKelompok) {
                return false;
            }

            const l = (m.level || '').toLowerCase().trim();
            if (profile && (profile.status === 4 || profile.status === 5)) {
                if (!MUDA_LEVELS.includes(l)) return false;
            }

            if (rekapGender !== 'SEMUA' && m.gender !== rekapGender) return false;
            if (rekapLevel !== 'SEMUA' && l !== rekapLevel.toLowerCase().trim()) return false;

            return true;
        });

        let overallH = 0, overallI = 0, overallS = 0, overallA = 0;
        const levelsMap: Record<string, { totalMembers: number; H: number; I: number; S: number; A: number }> = {};

        const summaryList = targetMembers.map(m => {
            let hCount = 0, iCount = 0, sCount = 0, aCount = 0;

            activeSessions.forEach(sDoc => {
                const rec = sDoc.records ? sDoc.records[m.uuid] : undefined;
                if (rec && rec.status) {
                    if (rec.status === 'H') hCount++;
                    else if (rec.status === 'I') iCount++;
                    else if (rec.status === 'S') sCount++;
                    else if (rec.status === 'A') aCount++;
                } else {
                    aCount++;
                }
            });

            overallH += hCount;
            overallI += iCount;
            overallS += sCount;
            overallA += aCount;

            const mLevel = m.level || 'Lainnya';
            if (!levelsMap[mLevel]) {
                levelsMap[mLevel] = { totalMembers: 0, H: 0, I: 0, S: 0, A: 0 };
            }
            levelsMap[mLevel].totalMembers += 1;
            levelsMap[mLevel].H += hCount;
            levelsMap[mLevel].I += iCount;
            levelsMap[mLevel].S += sCount;
            levelsMap[mLevel].A += aCount;

            const pct = totalSessionsCount > 0 ? Math.round((hCount / totalSessionsCount) * 100) : 0;

            return {
                memberId: m.uuid,
                name: m.name,
                alias: m.alias,
                kelompok: m.kelompok,
                level: m.level,
                gender: m.gender,
                order: m.order || 99,
                H: hCount,
                I: iCount,
                S: sCount,
                A: aCount,
                totalScheduled: totalSessionsCount,
                percentage: pct
            };
        }).sort((a, b) => a.order - b.order);

        const totalPossibleOverall = targetMembers.length * totalSessionsCount;
        const pctHadirOverall = totalPossibleOverall > 0 ? Math.round((overallH / totalPossibleOverall) * 100) : 0;
        const pctIzinSakitOverall = totalPossibleOverall > 0 ? Math.round(((overallI + overallS) / totalPossibleOverall) * 100) : 0;
        const pctAlfaOverall = totalPossibleOverall > 0 ? Math.max(0, 100 - pctHadirOverall - pctIzinSakitOverall) : 0;

        setOverallSummary({
            totalMembers: targetMembers.length,
            totalSessions: totalSessionsCount,
            totalExpected: totalPossibleOverall,
            H: overallH,
            I: overallI,
            S: overallS,
            IS: overallI + overallS,
            A: overallA,
            pctHadir: pctHadirOverall,
            pctIzinSakit: pctIzinSakitOverall,
            pctAlfa: pctAlfaOverall
        });

        const levelList = Object.entries(levelsMap).map(([lvlName, stat]) => {
            const totalPossibleLvl = stat.totalMembers * totalSessionsCount;
            const pctH = totalPossibleLvl > 0 ? Math.round((stat.H / totalPossibleLvl) * 100) : 0;
            const pctIS = totalPossibleLvl > 0 ? Math.round(((stat.I + stat.S) / totalPossibleLvl) * 100) : 0;
            const pctA = totalPossibleLvl > 0 ? Math.max(0, 100 - pctH - pctIS) : 0;

            return {
                level: lvlName,
                totalMembers: stat.totalMembers,
                totalExpected: totalPossibleLvl,
                H: stat.H,
                I: stat.I,
                S: stat.S,
                IS: stat.I + stat.S,
                A: stat.A,
                pctHadir: pctH,
                pctIzinSakit: pctIS,
                pctAlfa: pctA
            };
        }).sort((a, b) => b.pctHadir - a.pctHadir);

        setLevelSummaries(levelList);
        setRekapData(summaryList);
    }, [mode, selectedSessionDates, fetchedSessions, members, rekapKelompok, rekapGender, rekapLevel, profile]);

    // Session Date Toggle
    const toggleSessionDate = (date: string) => {
        setSelectedSessionDates(prev =>
            prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
        );
    };

    const handleToggleAllSessions = () => {
        if (selectedSessionDates.length === fetchedSessions.length) {
            setSelectedSessionDates([]);
        } else {
            setSelectedSessionDates(fetchedSessions.map(s => s.date));
        }
    };

    // Filter Rekap Data by Search Query
    const filteredRekapData = useMemo(() => {
        if (!searchQuery.trim()) return rekapData;
        const q = searchQuery.toLowerCase().trim();
        return rekapData.filter(r =>
            r.name.toLowerCase().includes(q) || (r.alias && r.alias.toLowerCase().includes(q))
        );
    }, [rekapData, searchQuery]);
    // --- EXPORT FUNCTIONALITIES ---
    const handleExportExcel = () => {
        if (mode === 'input') {
            const rows: (string | number)[][] = [
                [`ABSENSI SESI PENGAJIAN ${selectedKelompok.toUpperCase()}`],
                [`Tanggal Sesi`, dayjs(inputDate).format('dddd, DD MMMM YYYY')],
                [`Kelompok`, selectedKelompok],
                [''],
                ['No', 'Nama Lengkap', 'Alias', 'Jenjang / Level', 'Kelompok', 'Status Presensi', 'Waktu Absen', 'Catatan / Alasan']
            ];

            filteredInputMembers.forEach((m, idx) => {
                const rawStatus = recordsMap[m.uuid];
                const statusLabel =
                    rawStatus === 'H' ? 'Hadir (H)' :
                    rawStatus === 'I' ? 'Izin (I)' :
                    rawStatus === 'S' ? 'Sakit (S)' :
                    rawStatus === 'A' ? 'Alfa (A)' : 'Belum Diisi';

                const time = timesMap[m.uuid] || '-';
                const note = notesMap[m.uuid] || '-';
                rows.push([
                    idx + 1,
                    m.name,
                    m.alias || '-',
                    m.level || '-',
                    m.kelompok || '-',
                    statusLabel,
                    time,
                    note
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [
                { wch: 6 },   // No
                { wch: 28 },  // Nama Lengkap
                { wch: 18 },  // Alias
                { wch: 18 },  // Jenjang
                { wch: 18 },  // Kelompok
                { wch: 16 },  // Status Presensi
                { wch: 14 },  // Waktu Absen
                { wch: 32 }   // Catatan / Alasan
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Absensi Sesi');
            saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `Absensi_Sesi_${getKelompokSlug(selectedKelompok)}_${inputDate}.xlsx`);
            toast.success("File Excel Absensi Sesi berhasil diunduh");
        } else {
            // Sheet 1: Detail Jamaah
            const detailRows: (string | number)[][] = [
                [`REKAP KEHADIRAN JAMAAH - ${rekapKelompok === 'SEMUA' ? 'SEMUA KELOMPOK' : rekapKelompok.toUpperCase()}`],
                [`Periode`, `${dayjs(rekapStartDate).format('DD MMMM YYYY')} s/d ${dayjs(rekapEndDate).format('DD MMMM YYYY')}`],
                [`Total Sesi Pengajian`, `${selectedSessionDates.length} Sesi (${selectedSessionDates.join(', ')})`],
                [''],
                ['No', 'Nama Lengkap', 'Alias', 'Kelompok', 'Jenjang / Level', 'Hadir (H)', 'Izin (I)', 'Sakit (S)', 'Alfa (A)', 'Total Sesi', '% Kehadiran']
            ];

            filteredRekapData.forEach((row, idx) => {
                detailRows.push([
                    idx + 1,
                    row.name,
                    row.alias || '-',
                    row.kelompok,
                    row.level,
                    row.H,
                    row.I,
                    row.S,
                    row.A,
                    row.totalScheduled,
                    `${row.percentage}%`
                ]);
            });

            const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
            wsDetail['!cols'] = [
                { wch: 6 },   // No
                { wch: 28 },  // Nama
                { wch: 18 },  // Alias
                { wch: 18 },  // Kelompok
                { wch: 18 },  // Jenjang
                { wch: 12 },  // Hadir
                { wch: 12 },  // Izin
                { wch: 12 },  // Sakit
                { wch: 12 },  // Alfa
                { wch: 12 },  // Total Sesi
                { wch: 14 }   // % Kehadiran
            ];

            // Sheet 2: Ringkasan Per Jenjang
            const summaryRows: (string | number)[][] = [
                [`RINGKASAN KEHADIRAN PER JENJANG / LEVEL`],
                [`Periode`, `${dayjs(rekapStartDate).format('DD MMMM YYYY')} s/d ${dayjs(rekapEndDate).format('DD MMMM YYYY')}`],
                [''],
                ['Level / Jenjang', 'Total Anggota', '% Hadir', '% Izin & Sakit', '% Alfa', 'Presensi Hadir (H)', 'Presensi Izin & Sakit (I+S)', 'Presensi Alfa (A)'],
                [
                    'Gabungan Semua Level',
                    overallSummary.totalMembers,
                    `${overallSummary.pctHadir}%`,
                    `${overallSummary.pctIzinSakit}%`,
                    `${overallSummary.pctAlfa}%`,
                    overallSummary.H,
                    overallSummary.IS,
                    overallSummary.A
                ],
                ...levelSummaries.map(l => [
                    l.level,
                    l.totalMembers,
                    `${l.pctHadir}%`,
                    `${l.pctIzinSakit}%`,
                    `${l.pctAlfa}%`,
                    l.H,
                    l.IS,
                    l.A
                ])
            ];

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            wsSummary['!cols'] = [
                { wch: 22 },  // Level
                { wch: 16 },  // Total Anggota
                { wch: 14 },  // % Hadir
                { wch: 16 },  // % Izin & Sakit
                { wch: 14 },  // % Alfa
                { wch: 18 },  // Hadir
                { wch: 22 },  // Izin & Sakit
                { wch: 16 }   // Alfa
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Rekap Jamaah');
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Jenjang');
            saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), `Rekap_Absensi_${rekapKelompok}_${rekapStartDate}_${rekapEndDate}.xlsx`);
            toast.success("File Excel Rekap berhasil diunduh (2 Sheet)");
        }
    };

    const executeShareWA = () => {
        let msg = `*REKAP KEHADIRAN PENGAJIAN*\n`;
        msg += `🗓 Periode: ${dayjs(rekapStartDate).format('DD MMM')} - ${dayjs(rekapEndDate).format('DD MMM YYYY')}\n`;
        msg += `📌 Kelompok: ${rekapKelompok === 'SEMUA' ? 'Semua Kelompok' : rekapKelompok}\n`;
        msg += `⏱ Total Sesi Pengajian: ${selectedSessionDates.length} Sesi\n\n`;

        msg += `📊 *RINGKASAN GABUNGAN SEMUA JENJANG:*\n`;
        msg += `• Hadir: *${overallSummary.pctHadir}%* (${overallSummary.H} presensi)\n`;
        msg += `• Izin & Sakit: *${overallSummary.pctIzinSakit}%* (${overallSummary.IS} presensi - I:${overallSummary.I}, S:${overallSummary.S})\n`;
        msg += `• Alfa: *${overallSummary.pctAlfa}%* (${overallSummary.A} presensi)\n\n`;

        msg += `📌 *PERSENTASE KEHADIRAN PER JENJANG:*\n`;
        levelSummaries.forEach(lvl => {
            msg += `• *${lvl.level}*: Hadir ${lvl.pctHadir}% | Izin&Sakit ${lvl.pctIzinSakit}% | Alfa ${lvl.pctAlfa}%\n`;
        });

        msg += `\n👥 *PERSENTASE KEHADIRAN TIAP ANGGOTA:*\n`;
        filteredRekapData.forEach((item, idx) => {
            msg += `${idx + 1}. *${item.alias || item.name}* (${item.level}) : H:${item.H} | I:${item.I} | S:${item.S} | A:${item.A} (${item.percentage}%)\n`;
        });

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
        setIsShareModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 md:pb-12">
            {/* Header Sticky Navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <CalendarDays className="text-blue-600" size={24} />
                            Presensi & Rekap Kehadiran
                        </h1>
                        <p className="text-slate-500 text-xs sm:text-sm">
                            Manajemen absensi sesi harian dan rekap pencapaian kehadiran jamaah.
                        </p>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto w-full sm:w-auto">
                        <button
                            onClick={() => setMode('input')}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${mode === 'input'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <CalendarIcon size={16} /> Input Sesi
                        </button>
                        <button
                            onClick={() => setMode('rekap')}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${mode === 'rekap'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <FileText size={16} /> Rekap Presensi
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

                {mode === 'input' ? (
                    /* ================= TAB 1: INPUT ABSENSI SESI ================= */
                    <div className="space-y-6">
                        {/* Control Bar Input */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                            {/* Always Visible Top Bar (Tanggal Sesi + Toggle Filter Button) */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div className="flex-1 max-w-xs sm:max-w-sm">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Tanggal Sesi
                                    </label>
                                    <CustomDatePicker
                                        value={inputDate}
                                        onChange={(val) => setInputDate(val)}
                                        displayFormat="dddd, DD MMMM YYYY"
                                    />
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${showFilters
                                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                : activeFilterCount > 0
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Filter size={16} />
                                        {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                                        {activeFilterCount > 0 && !showFilters && (
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                        {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Filter Section */}
                            {showFilters && (
                                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Kelompok
                                        </label>
                                        {profile && (profile.status === 3 || profile.status === 5) ? (
                                            <input
                                                type="text"
                                                readOnly
                                                value={profile.kelompok}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold outline-none text-sm"
                                            />
                                        ) : (
                                            <select
                                                value={selectedKelompok}
                                                onChange={(e) => setSelectedKelompok(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                            >
                                                <option value="">-- Pilih Kelompok --</option>
                                                {availableKelompoks.map(k => (
                                                    <option key={k} value={k}>{k}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Jenis Kelamin
                                        </label>
                                        <select
                                            value={selectedGender}
                                            onChange={(e) => setSelectedGender(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                        >
                                            <option value="SEMUA">Semua Jenis Kelamin</option>
                                            <option value="Laki - Laki">Laki - Laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Jenjang / Level
                                        </label>
                                        <select
                                            value={selectedLevel}
                                            onChange={(e) => setSelectedLevel(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                        >
                                            <option value="SEMUA">
                                                {profile?.status === 4 || profile?.status === 5 ? 'Semua Level Muda/i' : 'Semua Level'}
                                            </option>
                                            {availableLevelOptions.map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search & Counter & Sort Bar */}
                        <div className="space-y-3">
                            {/* SEARCH BAR */}
                            <div className="relative w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari nama jamaah atau alias..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* SORT DROPDOWN + SAVE STATUS INDICATOR */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
                                    <ArrowUpDown size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="text-slate-400 hidden sm:inline">Urutkan:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as SortMode)}
                                        className="bg-transparent font-bold outline-none cursor-pointer text-slate-800 text-xs"
                                    >
                                        <option value="order">Urutan No</option>
                                        <option value="time_desc">Waktu Terakhir</option>
                                        <option value="time_asc">Waktu Terawal</option>
                                        <option value="name">Nama (A-Z)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                                    <span className={`w-2.5 h-2.5 rounded-full ${saveStatus === 'saving'
                                            ? 'bg-blue-500 animate-pulse'
                                            : saveStatus === 'saved'
                                                ? 'bg-emerald-500'
                                                : saveStatus === 'error'
                                                    ? 'bg-rose-500'
                                                    : 'bg-emerald-500'
                                        }`} />
                                    <span className="font-semibold text-slate-700">
                                        {saveStatus === 'saving' ? (
                                            <span className="text-blue-600 font-bold flex items-center gap-1">
                                                <Loader2 size={12} className="animate-spin inline" /> Menyimpan...
                                            </span>
                                        ) : saveStatus === 'saved' ? (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                <Check size={14} className="inline text-emerald-600" /> Tersimpan
                                            </span>
                                        ) : saveStatus === 'error' ? (
                                            <span className="text-rose-600 font-bold">Gagal</span>
                                        ) : (
                                            <span>{sessionDocExists ? 'Tersimpan' : 'Sesi Baru'}</span>
                                        )}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-bold text-slate-800">{filteredInputMembers.length} Jamaah</span>
                                </div>
                            </div>
                        </div>

                        {/* Presensi List / Table Container */}
                        {isSessionLoading ? (
                            <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                <Loader2 className="animate-spin mb-2" size={32} />
                                <p className="text-sm font-medium">Memuat data absensi sesi...</p>
                            </div>
                        ) : filteredInputMembers.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm">
                                <Users size={40} className="mx-auto mb-3 text-slate-300" />
                                <p className="font-bold text-slate-700">Tidak ada data anggota</p>
                                <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau kriteria filter.</p>
                            </div>
                        ) : (
                            <>
                                {/* MOBILE LIST VIEW (< md) */}
                                <div className="md:hidden space-y-3">
                                    {filteredInputMembers.map((m, idx) => {
                                        const status = recordsMap[m.uuid];
                                        const note = notesMap[m.uuid] || '';
                                        const showNoteInput = status === 'I' || status === 'S';

                                        return (
                                            <div
                                                key={m.uuid}
                                                className={`bg-white rounded-2xl p-4 border transition-all space-y-3 ${status
                                                        ? status === 'H' ? 'border-emerald-300 bg-emerald-50/10 shadow-sm'
                                                            : status === 'I' ? 'border-amber-300 bg-amber-50/10 shadow-sm'
                                                                : status === 'S' ? 'border-blue-300 bg-blue-50/10 shadow-sm'
                                                                    : 'border-rose-300 bg-rose-50/10 shadow-sm'
                                                        : 'border-slate-200 shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            {m.order || idx + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-slate-900 text-base leading-snug truncate">{m.name}</h4>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                {m.alias && <span className="text-xs text-slate-400">Alias: {m.alias}</span>}
                                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                    {m.level}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {timesMap[m.uuid] ? (
                                                        <div className="flex flex-col items-end flex-shrink-0">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                                                                <Clock size={12} className="text-blue-500" />
                                                                {timesMap[m.uuid]}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100 flex-shrink-0">
                                                            Belum Absen
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Mobile Touch-Friendly Status Buttons */}
                                                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'H')}
                                                        className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${status === 'H'
                                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 scale-[1.02]'
                                                                : 'bg-slate-50 text-slate-700 border border-slate-200 active:bg-emerald-100'
                                                            }`}
                                                    >
                                                        <span className="text-sm">H</span>
                                                        <span className="text-[10px] font-medium opacity-80">Hadir</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'I')}
                                                        className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${status === 'I'
                                                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-500 scale-[1.02]'
                                                                : 'bg-slate-50 text-slate-700 border border-slate-200 active:bg-amber-100'
                                                            }`}
                                                    >
                                                        <span className="text-sm">I</span>
                                                        <span className="text-[10px] font-medium opacity-80">Izin</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'S')}
                                                        className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${status === 'S'
                                                                ? 'bg-blue-500 text-white shadow-md shadow-blue-200 ring-2 ring-blue-500 scale-[1.02]'
                                                                : 'bg-slate-50 text-slate-700 border border-slate-200 active:bg-blue-100'
                                                            }`}
                                                    >
                                                        <span className="text-sm">S</span>
                                                        <span className="text-[10px] font-medium opacity-80">Sakit</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'A')}
                                                        className={`py-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all ${status === 'A'
                                                                ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-600 scale-[1.02]'
                                                                : 'bg-slate-50 text-slate-700 border border-slate-200 active:bg-rose-100'
                                                            }`}
                                                    >
                                                        <span className="text-sm">A</span>
                                                        <span className="text-[10px] font-medium opacity-80">Alfa</span>
                                                    </button>
                                                </div>

                                                {/* Catatan Input Box */}
                                                {showNoteInput && (
                                                    <div className="pt-2 border-t border-slate-100 animate-in fade-in">
                                                        <label className="block text-[11px] font-bold text-amber-700 mb-1 flex items-center gap-1">
                                                            <MessageSquare size={12} />
                                                            {status === 'I' ? 'Alasan Izin' : 'Keterangan Sakit'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder={
                                                                status === 'I'
                                                                    ? 'Contoh: Lembur kerja / Acara keluarga...'
                                                                    : 'Contoh: Demam / Berobat...'
                                                            }
                                                            value={note}
                                                            onChange={(e) => handleNoteChange(m.uuid, e.target.value)}
                                                            className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* DESKTOP TABLE VIEW (>= md) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-4 w-12 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSortBy('order')}>No</th>
                                                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setSortBy('name')}>Nama Jamaah</th>
                                                    <th className="p-4">Jenjang</th>
                                                    <th className="p-4">Kelompok</th>
                                                    <th className="p-4 text-center w-48">Status Presensi</th>
                                                    <th
                                                        className="p-4 text-center w-32 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => setSortBy(prev => prev === 'time_desc' ? 'time_asc' : 'time_desc')}
                                                        title="Klik untuk mengurutkan berdasarkan waktu absen"
                                                    >
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span>Waktu</span>
                                                            <ArrowUpDown size={14} className={sortBy.startsWith('time') ? 'text-blue-600 font-bold' : 'text-slate-400'} />
                                                        </div>
                                                    </th>
                                                    <th className="p-4 w-64">Catatan / Alasan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {filteredInputMembers.map((m, idx) => {
                                                    const status = recordsMap[m.uuid];
                                                    const note = notesMap[m.uuid] || '';
                                                    const time = timesMap[m.uuid];
                                                    const showNoteInput = status === 'I' || status === 'S';

                                                    return (
                                                        <tr key={m.uuid} className="hover:bg-slate-50/80 transition-colors">
                                                            <td className="p-4 text-center font-bold text-slate-400 text-xs">
                                                                {m.order || idx + 1}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800">{m.name}</div>
                                                                {m.alias && <div className="text-xs text-slate-400">Alias: {m.alias}</div>}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                    {m.level}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-slate-600 font-medium">
                                                                {m.kelompok}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'H')}
                                                                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${status === 'H'
                                                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                                                                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                                                            }`}
                                                                        title="Hadir"
                                                                    >
                                                                        H
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'I')}
                                                                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${status === 'I'
                                                                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200 scale-105'
                                                                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                                                            }`}
                                                                        title="Izin"
                                                                    >
                                                                        I
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'S')}
                                                                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${status === 'S'
                                                                                ? 'bg-blue-500 text-white shadow-md shadow-blue-200 scale-105'
                                                                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                                                            }`}
                                                                        title="Sakit"
                                                                    >
                                                                        S
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleMemberStatus(m.uuid, 'A')}
                                                                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${status === 'A'
                                                                                ? 'bg-rose-600 text-white shadow-md shadow-rose-200 scale-105'
                                                                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                                                            }`}
                                                                        title="Alfa"
                                                                    >
                                                                        A
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {time ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                                                                        <Clock size={12} className="text-slate-400" />
                                                                        {time}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-300 italic">-</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {showNoteInput ? (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={
                                                                            status === 'I'
                                                                                ? 'Contoh: Lembur kerja...'
                                                                                : 'Contoh: Demam...'
                                                                        }
                                                                        value={note}
                                                                        onChange={(e) => handleNoteChange(m.uuid, e.target.value)}
                                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs text-slate-300 italic">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    /* ================= TAB 2: REKAP RANGE TANGGAL ================= */
                    <div className="space-y-6">
                        {/* Control Bar Rekap */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                            {/* Always Visible Date Pickers & Filter Toggle */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Dari Tanggal
                                        </label>
                                        <CustomDatePicker
                                            value={rekapStartDate}
                                            onChange={(val) => setRekapStartDate(val)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Sampai Tanggal
                                        </label>
                                        <CustomDatePicker
                                            value={rekapEndDate}
                                            onChange={(val) => setRekapEndDate(val)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${showFilters
                                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                : activeFilterCount > 0
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Filter size={16} />
                                        {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
                                        {activeFilterCount > 0 && !showFilters && (
                                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                        {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Filter Section */}
                            {showFilters && (
                                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Kelompok
                                        </label>
                                        {profile && (profile.status === 3 || profile.status === 5) ? (
                                            <input
                                                type="text"
                                                readOnly
                                                value={profile.kelompok}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-semibold outline-none text-sm"
                                            />
                                        ) : (
                                            <select
                                                value={rekapKelompok}
                                                onChange={(e) => setRekapKelompok(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                            >
                                                <option value="SEMUA">-- Semua Kelompok --</option>
                                                {availableKelompoks.map(k => (
                                                    <option key={k} value={k}>{k}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Jenis Kelamin
                                        </label>
                                        <select
                                            value={rekapGender}
                                            onChange={(e) => setRekapGender(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                        >
                                            <option value="SEMUA">Semua Jenis Kelamin</option>
                                            <option value="Laki - Laki">Laki - Laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            Jenjang / Level
                                        </label>
                                        <select
                                            value={rekapLevel}
                                            onChange={(e) => setRekapLevel(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-sm"
                                        >
                                            <option value="SEMUA">
                                                {profile?.status === 4 || profile?.status === 5 ? 'Semua Level Muda/i' : 'Semua Level'}
                                            </option>
                                            {availableLevelOptions.map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SESSION DATES SELECTION BOX */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <CalendarDays size={18} className="text-blue-600" />
                                    Tanggal Sesi Pengajian ({selectedSessionDates.length} / {fetchedSessions.length} Terpilih)
                                </h3>
                                {fetchedSessions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleToggleAllSessions}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                    >
                                        {selectedSessionDates.length === fetchedSessions.length ? 'Batal Semua' : 'Pilih Semua'}
                                    </button>
                                )}
                            </div>

                            {fetchedSessions.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                    Tidak ditemukan sesi absensi pada rentang tanggal ini. Silakan ubah rentang tanggal atau kriteria filter.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {fetchedSessions.map(s => {
                                        const isSelected = selectedSessionDates.includes(s.date);
                                        return (
                                            <button
                                                key={s.date}
                                                type="button"
                                                onClick={() => toggleSessionDate(s.date)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                                                {dayjs(s.date).format('dddd, DD MMM YYYY')}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RINGKASAN GABUNGAN (DONUT CHART) & PER LEVEL */}
                        {selectedSessionDates.length > 0 && (
                            <div className="space-y-6">
                                {/* GABUNGAN SEMUA JENJANG (PIE / DONUT CHART CARD) */}
                                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        {/* Left Header Info */}
                                        <div className="space-y-1 text-center sm:text-left">
                                            <span className="text-xs font-bold tracking-wider text-blue-400 uppercase block">Ringkasan Kehadiran Gabungan</span>
                                            <h3 className="text-xl sm:text-2xl font-black text-white">Semua Jenjang / Level</h3>
                                            <p className="text-xs text-slate-300">
                                                Total {overallSummary.totalMembers} Jamaah • {overallSummary.totalSessions} Sesi Pengajian ({overallSummary.totalExpected} Presensi Diharapkan)
                                            </p>
                                        </div>

                                        {/* Center: Interactive Conic Gradient Donut Chart */}
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm w-full lg:w-auto">
                                            <div
                                                className="w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-lg relative flex-shrink-0"
                                                style={{
                                                    background: `conic-gradient(
                                                        #10b981 0% ${overallSummary.pctHadir}%,
                                                        #f59e0b ${overallSummary.pctHadir}% ${overallSummary.pctHadir + overallSummary.pctIzinSakit}%,
                                                        #f43f5e ${overallSummary.pctHadir + overallSummary.pctIzinSakit}% 100%
                                                    )`
                                                }}
                                            >
                                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 rounded-full flex flex-col items-center justify-center text-white shadow-inner">
                                                    <span className="text-xl sm:text-2xl font-black text-emerald-400">{overallSummary.pctHadir}%</span>
                                                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hadir</span>
                                                </div>
                                            </div>

                                            {/* Donut Legend */}
                                            <div className="space-y-2 text-xs w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-white block">{overallSummary.pctHadir}% Hadir</span>
                                                        <span className="text-[10px] text-slate-400">{overallSummary.H} presensi</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-white block">{overallSummary.pctIzinSakit}% Izin & Sakit</span>
                                                        <span className="text-[10px] text-slate-400">{overallSummary.IS} presensi (I: {overallSummary.I}, S: {overallSummary.S})</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0" />
                                                    <div>
                                                        <span className="font-bold text-white block">{overallSummary.pctAlfa}% Alfa</span>
                                                        <span className="text-[10px] text-slate-400">{overallSummary.A} presensi</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3 Category Main Stat Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
                                            <div>
                                                <span className="text-[11px] font-bold text-emerald-400 block uppercase">Hadir</span>
                                                <span className="text-2xl font-black text-white">{overallSummary.pctHadir}%</span>
                                                <span className="text-xs text-slate-300 block mt-0.5">{overallSummary.H} / {overallSummary.totalExpected} presensi</span>
                                            </div>
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base sm:text-lg">
                                                H
                                            </div>
                                        </div>

                                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
                                            <div>
                                                <span className="text-[11px] font-bold text-amber-400 block uppercase">Izin & Sakit</span>
                                                <span className="text-2xl font-black text-white">{overallSummary.pctIzinSakit}%</span>
                                                <span className="text-xs text-slate-300 block mt-0.5">{overallSummary.IS} presensi (I: {overallSummary.I}, S: {overallSummary.S})</span>
                                            </div>
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-base sm:text-lg">
                                                I+S
                                            </div>
                                        </div>

                                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <span className="text-[11px] font-bold text-rose-400 block uppercase">Alfa</span>
                                                <span className="text-2xl font-black text-white">{overallSummary.pctAlfa}%</span>
                                                <span className="text-xs text-slate-300 block mt-0.5">{overallSummary.A} / {overallSummary.totalExpected} presensi</span>
                                            </div>
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-base sm:text-lg">
                                                A
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PER LEVEL BREAKDOWN CARDS GRID */}
                                {levelSummaries.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Persentase Kehadiran Per Jenjang / Level</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {levelSummaries.map(lvl => (
                                                <div key={lvl.level} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h5 className="font-bold text-slate-900 text-base sm:text-lg">{lvl.level}</h5>
                                                            <p className="text-xs text-slate-400">{lvl.totalMembers} Jamaah • {lvl.totalExpected} Presensi</p>
                                                        </div>
                                                        {/* Mini Conic Gradient Donut */}
                                                        <div
                                                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0"
                                                            style={{
                                                                background: `conic-gradient(
                                                                    #10b981 0% ${lvl.pctHadir}%,
                                                                    #f59e0b ${lvl.pctHadir}% ${lvl.pctHadir + lvl.pctIzinSakit}%,
                                                                    #f43f5e ${lvl.pctHadir + lvl.pctIzinSakit}% 100%
                                                                )`
                                                            }}
                                                        >
                                                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-slate-800">
                                                                {lvl.pctHadir}%
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 3 Segment Multi Bar */}
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                                                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${lvl.pctHadir}%` }} title={`Hadir: ${lvl.pctHadir}%`} />
                                                        <div className="bg-amber-500 h-full transition-all" style={{ width: `${lvl.pctIzinSakit}%` }} title={`Izin & Sakit: ${lvl.pctIzinSakit}%`} />
                                                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${lvl.pctAlfa}%` }} title={`Alfa: ${lvl.pctAlfa}%`} />
                                                    </div>

                                                    {/* 3 Category Stat Cards */}
                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                        <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                                                            <span className="text-[10px] text-emerald-600 font-bold block uppercase">Hadir</span>
                                                            <span className="text-sm font-black text-emerald-700">{lvl.pctHadir}%</span>
                                                            <span className="text-[10px] text-emerald-600 block">{lvl.H} presensi</span>
                                                        </div>
                                                        <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
                                                            <span className="text-[10px] text-amber-600 font-bold block uppercase">Izin & Sakit</span>
                                                            <span className="text-sm font-black text-amber-700">{lvl.pctIzinSakit}%</span>
                                                            <span className="text-[10px] text-amber-600 block">{lvl.IS} presensi</span>
                                                        </div>
                                                        <div className="bg-rose-50 rounded-xl p-2 border border-rose-100">
                                                            <span className="text-[10px] text-rose-600 font-bold block uppercase">Alfa</span>
                                                            <span className="text-sm font-black text-rose-700">{lvl.pctAlfa}%</span>
                                                            <span className="text-[10px] text-rose-600 block">{lvl.A} presensi</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search & Export Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            {/* SEARCH BAR REKAP */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari rekap jamaah atau alias..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                                    <span>Total Sesi:</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg">{totalScheduledDays} Sesi</span>
                                </div>
                            </div>
                        </div>

                        {/* Rekap Table / List Container */}
                        {isRekapLoading ? (
                            <div className="bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                <Loader2 className="animate-spin mb-2" size={32} />
                                <p className="text-sm font-medium">Kalkulasi rekap presensi...</p>
                            </div>
                        ) : filteredRekapData.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-sm">
                                <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
                                <p className="font-bold text-slate-700">Data rekap tidak ditemukan</p>
                                <p className="text-xs text-slate-400 mt-1">Coba ubah rentang tanggal, pencarian, atau kriteria filter kelompok.</p>
                            </div>
                        ) : (
                            <>
                                {/* REKAP MOBILE CARDS (< md) */}
                                <div className="md:hidden space-y-3">
                                    {filteredRekapData.map((row, idx) => (
                                        <div
                                            key={row.memberId}
                                            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-slate-900 text-base leading-snug truncate">{row.name}</h4>
                                                        {row.alias && <p className="text-xs text-slate-400 truncate">Alias: {row.alias}</p>}
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${row.percentage >= 80
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : row.percentage >= 50
                                                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                            : 'bg-rose-100 text-rose-700 border-rose-200'
                                                    }`}>
                                                    {row.percentage}%
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">{row.kelompok}</span>
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">{row.level}</span>
                                                </div>
                                                <span className="text-xs text-slate-400 font-medium">Total: {row.totalScheduled} Sesi</span>
                                            </div>

                                            {/* Mini Multi Progress Bar per Member */}
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${row.totalScheduled > 0 ? (row.H / row.totalScheduled) * 100 : 0}%` }} />
                                                <div className="bg-amber-500 h-full" style={{ width: `${row.totalScheduled > 0 ? ((row.I + row.S) / row.totalScheduled) * 100 : 0}%` }} />
                                                <div className="bg-rose-500 h-full" style={{ width: `${row.totalScheduled > 0 ? (row.A / row.totalScheduled) * 100 : 0}%` }} />
                                            </div>

                                            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                                                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-100">
                                                    <span className="text-[10px] text-emerald-600 font-bold block uppercase">Hadir</span>
                                                    <span className="text-base font-black text-emerald-700">{row.H}</span>
                                                </div>
                                                <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
                                                    <span className="text-[10px] text-amber-600 font-bold block uppercase">Izin</span>
                                                    <span className="text-base font-black text-amber-700">{row.I}</span>
                                                </div>
                                                <div className="bg-blue-50 rounded-xl p-2 border border-blue-100">
                                                    <span className="text-[10px] text-blue-600 font-bold block uppercase">Sakit</span>
                                                    <span className="text-base font-black text-blue-700">{row.S}</span>
                                                </div>
                                                <div className="bg-rose-50 rounded-xl p-2 border border-rose-100">
                                                    <span className="text-[10px] text-rose-600 font-bold block uppercase">Alfa</span>
                                                    <span className="text-base font-black text-rose-700">{row.A}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* REKAP DESKTOP TABLE (>= md) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                                <tr>
                                                    <th className="p-4 w-12 text-center">No</th>
                                                    <th className="p-4">Nama Jamaah</th>
                                                    <th className="p-4">Kelompok</th>
                                                    <th className="p-4">Jenjang</th>
                                                    <th className="p-4 text-center text-emerald-600">Hadir</th>
                                                    <th className="p-4 text-center text-amber-600">Izin</th>
                                                    <th className="p-4 text-center text-blue-600">Sakit</th>
                                                    <th className="p-4 text-center text-rose-600">Alfa</th>
                                                    <th className="p-4 text-center">Total Sesi</th>
                                                    <th className="p-4 text-center">% Kehadiran</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm">
                                                {filteredRekapData.map((row, idx) => (
                                                    <tr key={row.memberId} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-4 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                                                        <td className="p-4 font-bold text-slate-800">
                                                            {row.name}
                                                            {row.alias && <span className="text-xs text-slate-400 block font-normal">Alias: {row.alias}</span>}
                                                        </td>
                                                        <td className="p-4 text-slate-600 font-medium">{row.kelompok}</td>
                                                        <td className="p-4">
                                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                {row.level}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center font-bold text-emerald-600">{row.H}</td>
                                                        <td className="p-4 text-center font-bold text-amber-600">{row.I}</td>
                                                        <td className="p-4 text-center font-bold text-blue-600">{row.S}</td>
                                                        <td className="p-4 text-center font-bold text-rose-600">{row.A}</td>
                                                        <td className="p-4 text-center font-semibold text-slate-600">{row.totalScheduled}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${row.percentage >= 80
                                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                    : row.percentage >= 50
                                                                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                        : 'bg-rose-100 text-rose-700 border-rose-200'
                                                                }`}>
                                                                {row.percentage}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BUTTONS (Excel & WhatsApp) */}
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 sm:gap-3 animate-in slide-in-from-bottom-5">
                {/* Excel Floating Button */}
                <button
                    type="button"
                    onClick={handleExportExcel}
                    className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs sm:text-sm px-4 py-3 rounded-full shadow-2xl border border-emerald-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group ring-4 ring-slate-900/5"
                    title="Export File Excel"
                >
                    <FileSpreadsheet size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Excel</span>
                </button>

                {/* WhatsApp Floating Button */}
                <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-4.5 py-3 rounded-full shadow-2xl shadow-emerald-600/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group border border-emerald-500/30 ring-4 ring-emerald-500/20"
                    title="Bagikan Rekap ke WhatsApp"
                >
                    <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                    <span>WhatsApp</span>
                </button>
            </div>

            {/* Modal Share WA */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-base">Share Rekap WhatsApp</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            Format ringkasan presensi akan disiapkan untuk dikirimkan ke grup WhatsApp.
                        </p>
                        <button
                            onClick={executeShareWA}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Share2 size={18} /> Kirim Sekarang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
