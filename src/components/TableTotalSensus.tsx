import React, { forwardRef, useRef, useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import dayjs from 'dayjs';
import { supabase } from '../supabase/client';
import { type Member } from '../types/Member';

// --- Interfaces ---
interface TableProps {}

interface SensusMetrics {
    balita_l: Member[]; balita_p: Member[];
    paud_l: Member[]; paud_p: Member[];
    caberawit_l: Member[]; caberawit_p: Member[];
    praremaja_l: Member[]; praremaja_p: Member[];
    remaja_l: Member[]; remaja_p: Member[];
    pranikah_l: Member[]; pranikah_p: Member[];
    menikah_l: Member[]; menikah_p: Member[];
    duda: Member[]; janda: Member[];
}

type GroupedCategories = {
    balita_l: any[]; balita_p: any[];
    paud_l: any[]; paud_p: any[];
    caberawit_l: any[]; caberawit_p: any[];
    praremaja_l: any[]; praremaja_p: any[];
    remaja_l: any[]; remaja_p: any[];
    pranikah_l: any[]; pranikah_p: any[];
    menikah_l: any[]; menikah_p: any[];
    duda: any[]; janda: any[];
};

type GroupedData = {
    kelompok1: GroupedCategories;
    kelompok2: GroupedCategories;
    kelompok3: GroupedCategories;
    kelompok4: GroupedCategories;
    kelompok5: GroupedCategories;
};

// --- Helper Functions ---
const createEmptyMetrics = (): SensusMetrics => ({
    balita_l: [], balita_p: [],
    paud_l: [], paud_p: [],
    caberawit_l: [], caberawit_p: [],
    praremaja_l: [], praremaja_p: [],
    remaja_l: [], remaja_p: [],
    pranikah_l: [], pranikah_p: [],
    menikah_l: [], menikah_p: [],
    duda: [], janda: []
});

const processSensusData = (members: Member[]) => {
    const g1 = createEmptyMetrics();
    const stats = {
        jumlahKK: 0,
        jumlahDuafa: { keluarga: 0, jiwa: 0 },
        jumlahBinaan: { l: 0, p: 0 }
    };
    const kkSet = new Set<string>();

    members.forEach(m => {
        const gender = (m.gender || '').toLowerCase().trim();
        const isLaki = gender === 'laki - laki' || gender === 'Laki - Laki' ;
        const status = (m.marriage_status || '').toLowerCase().trim();
        const level = (m.level || '').toLowerCase().trim();

        if (status === 'menikah') {
            isLaki ? g1.menikah_l.push(m) : g1.menikah_p.push(m);
        } else if (status === 'duda') {
            g1.duda.push(m);
        } else if (status === 'janda') {
            g1.janda.push(m);
        } else {
            if (level.includes('batita')) {
                isLaki ? g1.balita_l.push(m) : g1.balita_p.push(m);
            } else if (level.includes('paud')) {
                isLaki ? g1.paud_l.push(m) : g1.paud_p.push(m);
            } else if (level.includes('cabe rawit') ) {
                isLaki ? g1.caberawit_l.push(m) : g1.caberawit_p.push(m);
            } else if (level.includes('pra remaja') ) {
                isLaki ? g1.praremaja_l.push(m) : g1.praremaja_p.push(m);
            } else if (level.includes('remaja')) {
                isLaki ? g1.remaja_l.push(m) : g1.remaja_p.push(m);
            } else if (level.includes('pra nikah') || (level.includes('dewasa') && status === 'belum menikah')) {
                isLaki ? g1.pranikah_l.push(m) : g1.pranikah_p.push(m);
            }
        }

        if (m.is_educate) isLaki ? stats.jumlahBinaan.l++ : stats.jumlahBinaan.p++;
        if (m.is_duafa) stats.jumlahDuafa.jiwa++;
        
        if (m.id_family) {
            const familyIdStr = String(m.id_family);
            if (!kkSet.has(familyIdStr)) {
                kkSet.add(familyIdStr);
                stats.jumlahKK++;
                if (m.is_duafa) stats.jumlahDuafa.keluarga++;
            }
        }
    });

    const totalL = g1.balita_l.length + g1.paud_l.length + g1.caberawit_l.length + g1.praremaja_l.length + g1.remaja_l.length + g1.pranikah_l.length + g1.menikah_l.length + g1.duda.length;
    const totalP = g1.balita_p.length + g1.paud_p.length + g1.caberawit_p.length + g1.praremaja_p.length + g1.remaja_p.length + g1.pranikah_p.length + g1.menikah_p.length + g1.janda.length;

    return { g1, stats, totalL, totalP, totalAll: totalL + totalP };
};

// --- KOMPONEN UTAMA ---
const TabelSensus = forwardRef<HTMLDivElement, TableProps>((_) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // states for sheetdb data
    const [groupedData, setGroupedData] = useState<GroupedData | null>(null);
    const [totalsDesa, setTotalsDesa] = useState<Record<string, number> | null>(null);
    const [countKK, setCountKK] = useState<Record<string, number>>({});
    const [countBinaan, setCountBinaan] = useState<Record<string, { l: number; p: number }>>({});
    const [countDuafa, setCountDuafa] = useState<Record<string, number> | null>(null);

    // fetch supabase members (kept for backward compatibility / fallback)
    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('list_sensus')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                if (data) setMembers(data as Member[]);
            } catch (err: any) {
                console.error("Gagal ambil data:", err);
                // keep user-friendly notification
                // don't throw since sheetdb might still supply data
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

    // helper default empty groupedData
    const emptyGroup = (): GroupedCategories => ({
        balita_l: [], balita_p: [],
        paud_l: [], paud_p: [],
        caberawit_l: [], caberawit_p: [],
        praremaja_l: [], praremaja_p: [],
        remaja_l: [], remaja_p: [],
        pranikah_l: [], pranikah_p: [],
        menikah_l: [], menikah_p: [],
        duda: [], janda: []
    });

    // --- SheetDB fetchers (converted to async/await + safer parsing) ---
    const downloadDataKK = async () => {
        try {
            const params = "DATA KK DESA";
            const res = await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent(params)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            const grouped = data.reduce((acc: Record<string, any[]>, item: any) => {
                const kelompokKey = item.KELOMPOK || 'Tidak Diketahui';
                if (!acc[kelompokKey]) acc[kelompokKey] = [];
                acc[kelompokKey].push(item);
                return acc;
            }, {});
            const kelompokCounts = Object.keys(grouped).reduce((acc: Record<string, number>, kelompok: string) => {
                acc[kelompok] = grouped[kelompok]?.length ?? 0;
                return acc;
            }, {});
            setCountKK(kelompokCounts);
        } catch (error) {
            console.error('downloadDataKK error', error);
        }
    };

    const downloadDataBinaan = async () => {
        try {
            const params = "DATA BINAAN DESA";
            const res = await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent(params)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            const processedData: Record<string, { l: number; p: number }> = {
                kelompok1: { l: 0, p: 0 },
                kelompok2: { l: 0, p: 0 },
                kelompok3: { l: 0, p: 0 },
                kelompok4: { l: 0, p: 0 },
                kelompok5: { l: 0, p: 0 }
            };
            data.forEach((item: { KELOMPOK: string; "JENIS KELAMIN": string }) => {
                if (!item.KELOMPOK) return;
                const key = item.KELOMPOK.toLowerCase().replace(/\s+/g, ''); // e.g. "Kelompok 1" -> "kelompok1"
                const mapKey = `kelompok${key.replace(/[^0-9]/g, '')}`; // attempt safe map to kelompok1..5
                if (!processedData[mapKey]) return;
                if (item["JENIS KELAMIN"] === 'Laki - Laki') {
                    processedData[mapKey].l++;
                } else if (item["JENIS KELAMIN"] === 'Perempuan') {
                    processedData[mapKey].p++;
                }
            });
            setCountBinaan(processedData);
        } catch (error) {
            console.error('downloadDataBinaan error', error);
        }
    };
    const downloadDataDuafa = async () => {
        try {
            const params = "DATA DUAFA DESA";
            const res = await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent(params)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            const result: any = {
                totalJiwaKelompok1: 0, totalKeluargaKelompok1: 0,
                totalJiwaKelompok2: 0, totalKeluargaKelompok2: 0,
                totalJiwaKelompok3: 0, totalKeluargaKelompok3: 0,
                totalJiwaKelompok4: 0, totalKeluargaKelompok4: 0,
                totalJiwaKelompok5: 0, totalKeluargaKelompok5: 0
            };
            const familyCounts: { [key: string]: { [family: string]: boolean } } = {};

            data.forEach((item: any) => {
                const kelompok = item.KELOMPOK || 'Kelompok 1';
                const groupNum = (kelompok.match(/\d+/)?.[0]) ?? '1'; // fallback to 1
                const groupKey = `totalJiwaKelompok${groupNum}`;
                const familyGroupKey = `totalKeluargaKelompok${groupNum}`;
                const familyKey = item["NAMA KELUARGA"] || `${Math.random()}`;

                if (result[groupKey] !== undefined) result[groupKey]++;

                if (!familyCounts[kelompok]) familyCounts[kelompok] = {};
                if (!familyCounts[kelompok][familyKey]) {
                    familyCounts[kelompok][familyKey] = true;
                    if (result[familyGroupKey] !== undefined) result[familyGroupKey]++;
                }
            });

            setCountDuafa(result);
        } catch (error) {
            console.error('downloadDataDuafa error', error);
        }
    };

    // Download and group Sensus per kelompok (kelompok1..kelompok5)
    const downloadDataSensus = async () => {
        try {
            const params = "DATA JAMAAH DESA";
            const res = await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent(params)}`);
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();

            // prepare grouped structure
            const createGroupedData = (): GroupedData => ({
                kelompok1: JSON.parse(JSON.stringify(emptyGroup())),
                kelompok2: JSON.parse(JSON.stringify(emptyGroup())),
                kelompok3: JSON.parse(JSON.stringify(emptyGroup())),
                kelompok4: JSON.parse(JSON.stringify(emptyGroup())),
                kelompok5: JSON.parse(JSON.stringify(emptyGroup()))
            });

            const grouped: GroupedData = createGroupedData();

            // filter out non-active or luar daerah
            const filteredData = (data || []).filter((item: any) => {
                const sp = item["STATUS PONDOK"] ?? '';
                const sa = item["STATUS AKTIF"] ?? '';
                return sp !== "Luar Daerah" && sa !== "Tidak Aktif";
            });

            filteredData.forEach((person: any) => {
                const KELOMPOK = person.KELOMPOK || 'Kelompok 1';
                const JENJANG = person.JENJANG || '';
                const JENIS_KELAMIN = person["JENIS KELAMIN"] || '';
                const STATUS_PERNIKAHAN = person["STATUS PERNIKAHAN"] || '';

                if (KELOMPOK && KELOMPOK.startsWith("Kelompok ")) {
                    const groupNumber = parseInt(KELOMPOK.split(" ")[1]);
                    if (groupNumber >= 1 && groupNumber <= 5) {
                        const groupKey = `kelompok${groupNumber}` as keyof GroupedData;
                        const categories = grouped[groupKey];

                        if (JENJANG === "Balita") {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.balita_l.push(person) : categories.balita_p.push(person);
                        } else if (JENJANG === "Paud") {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.paud_l.push(person) : categories.paud_p.push(person);
                        } else if (JENJANG === "Caberawit") {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.caberawit_l.push(person) : categories.caberawit_p.push(person);
                        } else if (JENJANG === "Pra Remaja") {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.praremaja_l.push(person) : categories.praremaja_p.push(person);
                        } else if (JENJANG === "Remaja") {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.remaja_l.push(person) : categories.remaja_p.push(person);
                        } else if (JENJANG === "Pra Nikah" || (JENJANG === "Dewasa" && STATUS_PERNIKAHAN === "Belum Menikah")) {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.pranikah_l.push(person) : categories.pranikah_p.push(person);
                        } else if ((JENJANG === "Lansia" && STATUS_PERNIKAHAN === "Menikah") || (JENJANG === "Dewasa" && STATUS_PERNIKAHAN === "Menikah")) {
                            JENIS_KELAMIN === "Laki - Laki" ? categories.menikah_l.push(person) : categories.menikah_p.push(person);
                        }

                        if (STATUS_PERNIKAHAN === "Janda") categories.janda.push(person);
                        else if (STATUS_PERNIKAHAN === "Duda") categories.duda.push(person);
                    }
                }
            });

            // compute totals for desa
            const kelompokKeys = ['kelompok1','kelompok2','kelompok3','kelompok4','kelompok5'] as const;
            const totals: Record<string, number> = {};

            const sumFor = (cat: keyof GroupedCategories) =>
                kelompokKeys.reduce((s, g) => s + (grouped[g as keyof GroupedData][cat]?.length || 0), 0);

            totals.totalBalita_lDesa = sumFor('balita_l');
            totals.totalBalita_pDesa = sumFor('balita_p');
            totals.totalPaud_lDesa = sumFor('paud_l');
            totals.totalPaud_pDesa = sumFor('paud_p');
            totals.totalCaberawit_lDesa = sumFor('caberawit_l');
            totals.totalCaberawit_pDesa = sumFor('caberawit_p');
            totals.totalPraremaja_lDesa = sumFor('praremaja_l');
            totals.totalPraremaja_pDesa = sumFor('praremaja_p');
            totals.totalRemaja_lDesa = sumFor('remaja_l');
            totals.totalRemaja_pDesa = sumFor('remaja_p');
            totals.totalPraNikah_lDesa = sumFor('pranikah_l');
            totals.totalPraNikah_pDesa = sumFor('pranikah_p');
            totals.totalMenikah_lDesa = sumFor('menikah_l');
            totals.totalMenikah_pDesa = sumFor('menikah_p');
            totals.totalDudaDesa = sumFor('duda');
            totals.totalJandaDesa = sumFor('janda');

            setGroupedData(grouped);
            setTotalsDesa(totals);
        } catch (error) {
            console.error('downloadDataSensus error', error);
        }
    };

    // call SheetDB fetchers once on mount
    useEffect(() => {
        downloadDataKK();
        downloadDataBinaan();
        downloadDataDuafa();
        downloadDataSensus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // For rendering: if groupedData exists use it; otherwise fallback to supabase-processed g1
    const { g1, stats, totalAll } = useMemo(() => processSensusData(members), [members]);

    // --- STYLING (WARNA TAILWIND) ---
    const colors = {
        table1: '#E2DFD0',
        table2: '#FEB941',
        table3: '#6DC5D1',
        table4: '#ACE1AF',
        table5: '#FDE49E',
        white: '#FFFFFF',
        border: '#000000'
    };

    const s = {
        table: { borderCollapse: 'collapse' as const, width: '100%', fontFamily: 'Arial, Helvetica, sans-serif' },
        th: {
            border: `1px solid ${colors.border}`,
            padding: '8px 4px',
            fontSize: '16px',
            fontWeight: 'bold',
            textAlign: 'center' as const,
            verticalAlign: 'middle',
            color: 'black'
        },
        td: {
            border: `1px solid ${colors.border}`,
            padding: '6px 4px',
            fontSize: '16px',
            textAlign: 'center' as const,
            verticalAlign: 'middle',
            color: 'black',
            height: '35px'
        }
    };

    const wKelompok = '130px';
    const wData = '50px';
    const wTotal = '80px';
    const wKK = '80px';
    const wDuafa = '150px';
    const wBinaan = '50px';

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;

        try {
            const dataUrl = await toPng(printRef.current, {
                cacheBust: true,
                backgroundColor: 'white',
                pixelRatio: 2,
                width: printRef.current.scrollWidth,
                height: printRef.current.scrollHeight,
                style: { transform: 'none', margin: '0', overflow: 'visible' }
            });

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const margin = 10;
            const availableWidth = pdfWidth - (margin * 2);
            const availableHeight = pdfHeight - (margin * 2);

            const ratio = Math.min(availableWidth / imgProps.width, availableHeight / imgProps.height);

            const widthInPdf = imgProps.width * ratio;
            const heightInPdf = imgProps.height * ratio;

            const xPos = (pdfWidth - widthInPdf) / 2;
            const yPos = margin;

            pdf.addImage(dataUrl, 'PNG', xPos, yPos, widthInPdf, heightInPdf);
            pdf.save(`Laporan_Sensus_${dayjs().format('MMMM_YYYY')}.pdf`);
        } catch (err) {
            console.error('Gagal generate PDF:', err);
            alert('Gagal mendownload PDF. Silakan coba lagi.');
        }
    };

    // Loading UX: if both sources not ready show loader
    const isLoadingAll = loading && !groupedData;

    if (isLoadingAll) return (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
            <p className="text-slate-500 font-medium">Memuat Data Laporan...</p>
        </div>
    );

    // helper to read value for a group from groupedData or fallback to g1
const readGroupValue = (groupIndex: number, category: keyof GroupedCategories) => {
    // KELOMPOK 1 = SUPABASE
    if (groupIndex === 1) {
        switch (category) {
            case 'balita_l': return g1.balita_l.length;
            case 'balita_p': return g1.balita_p.length;
            case 'paud_l': return g1.paud_l.length;
            case 'paud_p': return g1.paud_p.length;
            case 'caberawit_l': return g1.caberawit_l.length;
            case 'caberawit_p': return g1.caberawit_p.length;
            case 'praremaja_l': return g1.praremaja_l.length;
            case 'praremaja_p': return g1.praremaja_p.length;
            case 'remaja_l': return g1.remaja_l.length;
            case 'remaja_p': return g1.remaja_p.length;
            case 'pranikah_l': return g1.pranikah_l.length;
            case 'pranikah_p': return g1.pranikah_p.length;
            case 'menikah_l': return g1.menikah_l.length;
            case 'menikah_p': return g1.menikah_p.length;
            case 'duda': return g1.duda.length;
            case 'janda': return g1.janda.length;
            default: return 0;
        }
    }

    // KELOMPOK 2–5 = SHEETDB
    if (!groupedData) return 0;

    const key = `kelompok${groupIndex}` as keyof GroupedData;
    return groupedData[key]?.[category]?.length ?? 0;
};


    const readGroupTotalL = (groupIndex: number) => {
        const cats: (keyof GroupedCategories)[] = ['balita_l','paud_l','caberawit_l','praremaja_l','remaja_l','pranikah_l','menikah_l','duda'];
        return cats.reduce((s, c) => s + readGroupValue(groupIndex, c), 0);
    };
    const readGroupTotalP = (groupIndex: number) => {
        const cats: (keyof GroupedCategories)[] = ['balita_p','paud_p','caberawit_p','praremaja_p','remaja_p','pranikah_p','menikah_p','janda'];
        return cats.reduce((s, c) => s + readGroupValue(groupIndex, c), 0);
    };
    const readGroupTotalAll = (groupIndex: number) => readGroupTotalL(groupIndex) + readGroupTotalP(groupIndex);

    // totals for desa prefer totalsDesa (sheet) else fallback to computed from supabase g1
    const desaTotals = totalsDesa ?? {
        totalBalita_lDesa: readGroupValue(1, 'balita_l'),
        totalBalita_pDesa: readGroupValue(1, 'balita_p'),
        totalPaud_lDesa: readGroupValue(1, 'paud_l'),
        totalPaud_pDesa: readGroupValue(1, 'paud_p'),
        totalCaberawit_lDesa: readGroupValue(1, 'caberawit_l'),
        totalCaberawit_pDesa: readGroupValue(1, 'caberawit_p'),
        totalPraremaja_lDesa: readGroupValue(1, 'praremaja_l'),
        totalPraremaja_pDesa: readGroupValue(1, 'praremaja_p'),
        totalRemaja_lDesa: readGroupValue(1, 'remaja_l'),
        totalRemaja_pDesa: readGroupValue(1, 'remaja_p'),
        totalPraNikah_lDesa: readGroupValue(1, 'pranikah_l'),
        totalPraNikah_pDesa: readGroupValue(1, 'pranikah_p'),
        totalMenikah_lDesa: readGroupValue(1, 'menikah_l'),
        totalMenikah_pDesa: readGroupValue(1, 'menikah_p'),
        totalDudaDesa: readGroupValue(1, 'duda'),
        totalJandaDesa: readGroupValue(1, 'janda')
    };

    return (
        <div className="w-full">
            <div className="text-center my-6">
                <button
                    onClick={handleDownloadPDF}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                >
                    Download Laporan PDF
                </button>
            </div>

            <div className="w-full overflow-x-auto pb-6 px-2 sm:px-4">
                <div
                    ref={printRef}
                    style={{
                        minWidth: '2000px',
                        width: '2000px',
                        backgroundColor: 'white',
                        padding: '40px',
                        margin: '0 auto'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h3 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                            DAFTAR SENSUS DESA KELAPA DUA
                        </h3>
                        <h3 style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                            BULAN {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </h3>
                    </div>

                    <table style={s.table}>
                        <thead>
                            <tr>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wKelompok }} rowSpan={3}>Kelompok</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={12}>Belum Menikah</th>
                                <th style={{ ...s.th, backgroundColor: colors.table3 }} colSpan={2} rowSpan={2}>Menikah</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={2} rowSpan={2}>Duda / Janda</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={2} rowSpan={2}>Jumlah</th>
                                <th style={{ ...s.th, backgroundColor: colors.table4, width: wTotal }} rowSpan={3}>Total</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wKK }} rowSpan={3}>Jumlah <br /> KK</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wDuafa }} rowSpan={3}>Duafa</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={2} rowSpan={2}>Binaan</th>
                            </tr>
                            <tr>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Balita</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Paud</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Caberawit</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Pra Remaja</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Remaja</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2}>Dewasa</th>
                            </tr>
                            <tr>
                                {[...Array(6)].map((_, i) => (
                                    <React.Fragment key={i}>
                                        <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th>
                                        <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                    </React.Fragment>
                                ))}
                                <th style={{ ...s.th, backgroundColor: colors.table3, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table3, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table1, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: '60px' }}>L</th><th style={{ ...s.th, backgroundColor: colors.table1, width: '60px' }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wBinaan }}>L</th><th style={{ ...s.th, backgroundColor: colors.table1, width: wBinaan }}>P</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- KELOMPOK 1 (DATA) --- */}
                            <tr>
                                <td style={s.td}>Kelompok 1</td>
                                <td style={s.td}>{readGroupValue(1, 'balita_l')}</td><td style={s.td}>{readGroupValue(1, 'balita_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'paud_l')}</td><td style={s.td}>{readGroupValue(1, 'paud_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'caberawit_l')}</td><td style={s.td}>{readGroupValue(1, 'caberawit_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'praremaja_l')}</td><td style={s.td}>{readGroupValue(1, 'praremaja_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'remaja_l')}</td><td style={s.td}>{readGroupValue(1, 'remaja_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'pranikah_l')}</td><td style={s.td}>{readGroupValue(1, 'pranikah_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'menikah_l')}</td><td style={s.td}>{readGroupValue(1, 'menikah_p')}</td>
                                <td style={s.td}>{readGroupValue(1, 'duda')}</td><td style={s.td}>{readGroupValue(1, 'janda')}</td>
                                <td style={s.td}>{readGroupTotalL(1)}</td><td style={s.td}>{readGroupTotalP(1)}</td>

                                <td rowSpan={2} style={{ ...s.td, backgroundColor: colors.table4, fontWeight: 'bold' }}>{(groupedData ? readGroupTotalAll(1) + (groupedData ? 0 : totalAll) : totalAll)}</td>
                                <td rowSpan={2} style={s.td}>{countKK['Kelompok 1'] ?? countKK['Kelompok 1'] ?? stats.jumlahKK}</td>

                                {/* Duafa block (single cell spanning many rows)
                                    If countDuafa exists we show per-kelompok jiwa/kk values inside this block.
                                */}
                                <td rowSpan={10} style={{ ...s.td, textAlign: 'left', padding: '10px', verticalAlign: 'top', fontSize: '14px', lineHeight: '1.4' }}>
                                    <div style={{ fontWeight: 'bold' }}>{countDuafa?.totalKeluargaKelompok1 ?? (stats.jumlahDuafa.keluarga ?? 0)} KK</div>
                                    <div style={{ fontWeight: 'bold' }}>{countDuafa?.totalJiwaKelompok1 ?? (stats.jumlahDuafa.jiwa ?? 0)} Jiwa</div>
                                    <div style={{ borderTop: '2px dashed #666', margin: '8px 0' }}></div>
                                    <div>Kel 1: {countDuafa?.totalJiwaKelompok1 ?? (stats.jumlahDuafa.jiwa ?? 0)}</div>
                                    <div>Kel 2: {countDuafa?.totalJiwaKelompok2 ?? 0}</div>
                                    <div>Kel 3: {countDuafa?.totalJiwaKelompok3 ?? 0}</div>
                                    <div>Kel 4: {countDuafa?.totalJiwaKelompok4 ?? 0}</div>
                                    <div>Kel 5: {countDuafa?.totalJiwaKelompok5 ?? 0}</div>
                                </td>

                                <td style={s.td}>{countBinaan?.kelompok1?.l ?? countBinaan?.kelompok1?.l ?? (stats.jumlahBinaan.l ?? 0)}</td>
                                <td style={s.td}>{countBinaan?.kelompok1?.p ?? countBinaan?.kelompok1?.p ?? (stats.jumlahBinaan.p ?? 0)}</td>
                            </tr>
                            <tr style={{ backgroundColor: colors.table5 }}>
                                <td style={{ ...s.td, fontWeight: 'bold' }}>Jumlah</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'balita_l') + readGroupValue(1, 'balita_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'paud_l') + readGroupValue(1, 'paud_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'caberawit_l') + readGroupValue(1, 'caberawit_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'praremaja_l') + readGroupValue(1, 'praremaja_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'remaja_l') + readGroupValue(1, 'remaja_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'pranikah_l') + readGroupValue(1, 'pranikah_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'menikah_l') + readGroupValue(1, 'menikah_p')}</td>
                                <td colSpan={2} style={s.td}>{readGroupValue(1, 'duda') + readGroupValue(1, 'janda')}</td>
                                <td colSpan={2} style={s.td}>{readGroupTotalAll(1)}</td>
                                <td colSpan={2} style={s.td}>{(countBinaan?.kelompok1?.l ?? 0) + (countBinaan?.kelompok1?.p ?? 0)}</td>
                            </tr>

                            {/* KELOMPOK 2 - 5 (data dari SheetDB jika tersedia, else zeros) */}
                            {[2, 3, 4, 5].map(k => (
                                <React.Fragment key={k}>
                                    <tr>
                                        <td style={s.td}>Kelompok {k}</td>
                                        <td style={s.td}>{readGroupValue(k, 'balita_l')}</td><td style={s.td}>{readGroupValue(k, 'balita_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'paud_l')}</td><td style={s.td}>{readGroupValue(k, 'paud_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'caberawit_l')}</td><td style={s.td}>{readGroupValue(k, 'caberawit_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'praremaja_l')}</td><td style={s.td}>{readGroupValue(k, 'praremaja_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'remaja_l')}</td><td style={s.td}>{readGroupValue(k, 'remaja_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'pranikah_l')}</td><td style={s.td}>{readGroupValue(k, 'pranikah_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'menikah_l')}</td><td style={s.td}>{readGroupValue(k, 'menikah_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'duda')}</td><td style={s.td}>{readGroupValue(k, 'janda')}</td>
                                        <td style={s.td}>{readGroupTotalL(k)}</td><td style={s.td}>{readGroupTotalP(k)}</td>

                                        <td rowSpan={2} style={{ ...s.td, backgroundColor: colors.table4, fontWeight: 'bold' }}>{readGroupTotalAll(k)}</td>
                                        <td rowSpan={2} style={s.td}>{countKK[`Kelompok ${k}`] ?? 0}</td>
                                        <td style={s.td}>{countBinaan?.[`kelompok${k}`]?.l ?? 0}</td>
                                        <td style={s.td}>{countBinaan?.[`kelompok${k}`]?.p ?? 0}</td>
                                    </tr>
                                    <tr style={{ backgroundColor: colors.table5 }}>
                                        <td style={{ ...s.td, fontWeight: 'bold' }}>Jumlah</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'balita_l') + readGroupValue(k, 'balita_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'paud_l') + readGroupValue(k, 'paud_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'caberawit_l') + readGroupValue(k, 'caberawit_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'praremaja_l') + readGroupValue(k, 'praremaja_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'remaja_l') + readGroupValue(k, 'remaja_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'pranikah_l') + readGroupValue(k, 'pranikah_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'menikah_l') + readGroupValue(k, 'menikah_p')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupValue(k, 'duda') + readGroupValue(k, 'janda')}</td>
                                        <td colSpan={2} style={s.td}>{readGroupTotalAll(k)}</td>
                                        <td colSpan={2} style={s.td}>{(countBinaan?.[`kelompok${k}`]?.l ?? 0) + (countBinaan?.[`kelompok${k}`]?.p ?? 0)}</td>
                                    </tr>
                                </React.Fragment>
                            ))}

                            {/* TOTAL HEADER L/P */}
                            <tr style={{ backgroundColor: colors.table4, fontWeight: 'bold' }}>
                                <td style={s.td}>Jumlah L/P</td>
                                <td style={s.td}>{desaTotals.totalBalita_lDesa}</td><td style={s.td}>{desaTotals.totalBalita_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalPaud_lDesa}</td><td style={s.td}>{desaTotals.totalPaud_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalCaberawit_lDesa}</td><td style={s.td}>{desaTotals.totalCaberawit_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalPraremaja_lDesa}</td><td style={s.td}>{desaTotals.totalPraremaja_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalRemaja_lDesa}</td><td style={s.td}>{desaTotals.totalRemaja_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalPraNikah_lDesa}</td><td style={s.td}>{desaTotals.totalPraNikah_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalMenikah_lDesa}</td><td style={s.td}>{desaTotals.totalMenikah_pDesa}</td>
                                <td style={s.td}>{desaTotals.totalDudaDesa}</td><td style={s.td}>{desaTotals.totalJandaDesa}</td>
                                <td style={s.td}>{(desaTotals.totalBalita_lDesa + desaTotals.totalCaberawit_lDesa + desaTotals.totalPaud_lDesa + desaTotals.totalPraremaja_lDesa + desaTotals.totalRemaja_lDesa + desaTotals.totalPraNikah_lDesa + desaTotals.totalMenikah_lDesa + desaTotals.totalDudaDesa) /* approx for L */}</td>
                                <td style={s.td}>{(desaTotals.totalBalita_pDesa + desaTotals.totalCaberawit_pDesa + desaTotals.totalPaud_pDesa + desaTotals.totalPraremaja_pDesa + desaTotals.totalRemaja_pDesa + desaTotals.totalPraNikah_pDesa + desaTotals.totalMenikah_pDesa + desaTotals.totalJandaDesa) /* approx for P */}</td>
                                <td rowSpan={2} style={s.td}>{(desaTotals.totalBalita_lDesa + desaTotals.totalPaud_lDesa + desaTotals.totalCaberawit_lDesa + desaTotals.totalPraremaja_lDesa + desaTotals.totalRemaja_lDesa + desaTotals.totalPraNikah_lDesa + desaTotals.totalMenikah_lDesa + desaTotals.totalDudaDesa) + (desaTotals.totalBalita_pDesa + desaTotals.totalPaud_pDesa + desaTotals.totalCaberawit_pDesa + desaTotals.totalPraremaja_pDesa + desaTotals.totalRemaja_pDesa + desaTotals.totalPraNikah_pDesa + desaTotals.totalMenikah_pDesa + desaTotals.totalJandaDesa)}</td>
                                <td rowSpan={2} style={s.td}>{Object.values(countKK).reduce((s, v) => s + (v ?? 0), 0)}</td>
                                <td rowSpan={2} style={s.td}>{countDuafa ? Object.values(countDuafa).reduce((s, v) => typeof v === 'number' ? s + v : s, 0) : stats.jumlahDuafa.jiwa}</td>
                                <td style={s.td}>{Object.values(countBinaan).reduce((s, v) => s + (v?.l ?? 0), 0)}</td>
                                <td style={s.td}>{Object.values(countBinaan).reduce((s, v) => s + (v?.p ?? 0), 0)}</td>
                            </tr>
                            <tr style={{ backgroundColor: colors.table4, fontWeight: 'bold' }}>
                                <td style={s.td}>Total</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalBalita_lDesa + desaTotals.totalBalita_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalPaud_lDesa + desaTotals.totalPaud_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalCaberawit_lDesa + desaTotals.totalCaberawit_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalPraremaja_lDesa + desaTotals.totalPraremaja_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalRemaja_lDesa + desaTotals.totalRemaja_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalPraNikah_lDesa + desaTotals.totalPraNikah_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalMenikah_lDesa + desaTotals.totalMenikah_pDesa}</td>
                                <td colSpan={2} style={s.td}>{desaTotals.totalDudaDesa + desaTotals.totalJandaDesa}</td>
                                <td colSpan={2} style={s.td}>{(desaTotals.totalBalita_lDesa + desaTotals.totalPaud_lDesa + desaTotals.totalCaberawit_lDesa + desaTotals.totalPraremaja_lDesa + desaTotals.totalRemaja_lDesa + desaTotals.totalPraNikah_lDesa + desaTotals.totalMenikah_lDesa + desaTotals.totalDudaDesa) + (desaTotals.totalBalita_pDesa + desaTotals.totalPaud_pDesa + desaTotals.totalCaberawit_pDesa + desaTotals.totalPraremaja_pDesa + desaTotals.totalRemaja_pDesa + desaTotals.totalPraNikah_pDesa + desaTotals.totalMenikah_pDesa + desaTotals.totalJandaDesa)}</td>
                                <td colSpan={2} style={s.td}>{Object.values(countBinaan).reduce((s, v) => s + (v?.l ?? 0) + (v?.p ?? 0), 0)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '150px', fontFamily: 'Arial, sans-serif' }}>
                        <div style={{ border: '2px solid black', padding: '15px', fontSize: '16px', display: 'flex', gap: '40px', backgroundColor: 'white' }}>
                            <div>
                                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px' }}>Keterangan</p>
                                <table style={{ border: 'none', fontSize: '16px' }}>
                                    <tbody>
                                        <tr><td style={{padding: '3px'}}>Balita</td><td style={{padding: '3px'}}>: 0 - 3 Tahun</td></tr>
                                        <tr><td style={{padding: '3px'}}>Paud</td><td style={{padding: '3px'}}>: 4 - 5 Tahun</td></tr>
                                        <tr><td style={{padding: '3px'}}>Caberawit</td><td style={{padding: '3px'}}>: 6 - 12 Tahun (SD)</td></tr>
                                        <tr><td style={{padding: '3px'}}>Pra Remaja</td><td style={{padding: '3px'}}>: 13 - 15 Tahun (SMP)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ paddingTop: '28px' }}>
                                <table style={{ border: 'none', fontSize: '16px' }}>
                                    <tbody>
                                        <tr><td style={{padding: '3px'}}>Remaja</td><td style={{padding: '3px'}}>: 16 - 18 Tahun (SMA)</td></tr>
                                        <tr><td style={{padding: '3px'}}>Dewasa</td><td style={{padding: '3px'}}>: 19 Tahun+ (Belum Nikah)</td></tr>
                                        <tr><td style={{padding: '3px'}}>L</td><td style={{padding: '3px'}}>:
                                            Laki - laki</td></tr>
                                        <tr><td style={{padding: '3px'}}>P</td><td style={{padding: '3px'}}>:
                                            Perempuan</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginRight: '80px', fontSize: '16px' }}>
                            <p style={{ margin: '0 0 100px 0' }}>Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p style={{ margin: 0, textDecoration: 'underline', fontWeight: 'bold', fontSize: '18px' }}>H. Sulaiman</p>
                            <p style={{ margin: 0, fontSize: '16px' }}>KI Desa</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default TabelSensus;
