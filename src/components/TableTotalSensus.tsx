import { forwardRef, useRef, useMemo, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/client';
import { type Member } from '../types/Member';

// --- Interfaces ---
interface TableProps { }

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
    const createEmptyStats = () => ({
        jumlahKK: 0,
        jumlahDuafa: { keluarga: 0, jiwa: 0 },
        jumlahBinaan: { l: 0, p: 0 }
    });

    const groups: Record<number, { metrics: SensusMetrics; stats: ReturnType<typeof createEmptyStats>; totalL: number; totalP: number; totalAll: number }> = {};
    const kkSets: Record<number, Set<string>> = {};

    for (let i = 1; i <= 5; i++) {
        groups[i] = {
            metrics: createEmptyMetrics(),
            stats: createEmptyStats(),
            totalL: 0,
            totalP: 0,
            totalAll: 0
        };
        kkSets[i] = new Set<string>();
    }

    members.forEach(m => {
        const kelompokMatch = m.kelompok?.match(/\d+/);
        const groupIndex = kelompokMatch ? parseInt(kelompokMatch[0]) : 1;
        if (groupIndex < 1 || groupIndex > 5) return;

        const g = groups[groupIndex].metrics;
        const s = groups[groupIndex].stats;

        const gender = (m.gender || '').toLowerCase().trim();
        const isLaki = gender === 'laki - laki' || gender === 'Laki - Laki';

        if (!m.is_educate) {
            const status = (m.marriage_status || '').toLowerCase().trim();
            const level = (m.level || '').toLowerCase().trim();

            if (status === 'menikah') {
                isLaki ? g.menikah_l.push(m) : g.menikah_p.push(m);
            } else if (status === 'duda') {
                g.duda.push(m);
            } else if (status === 'janda') {
                g.janda.push(m);
            } else {
                if (level.includes('batita') || level.includes('balita')) {
                    isLaki ? g.balita_l.push(m) : g.balita_p.push(m);
                } else if (level.includes('paud')) {
                    isLaki ? g.paud_l.push(m) : g.paud_p.push(m);
                } else if (level.includes('cabe rawit')) {
                    isLaki ? g.caberawit_l.push(m) : g.caberawit_p.push(m);
                } else if (level.includes('pra remaja')) {
                    isLaki ? g.praremaja_l.push(m) : g.praremaja_p.push(m);
                } else if (level.includes('remaja')) {
                    isLaki ? g.remaja_l.push(m) : g.remaja_p.push(m);
                } else if (level.includes('pra nikah') || (level.includes('dewasa') && status === 'belum menikah')) {
                    isLaki ? g.pranikah_l.push(m) : g.pranikah_p.push(m);
                }
            }
        }

        if (m.is_educate) isLaki ? s.jumlahBinaan.l++ : s.jumlahBinaan.p++;
        if (m.is_duafa) s.jumlahDuafa.jiwa++;

        if (m.family_id && !m.family_name?.startsWith('Rantau')) {
            const familyIdStr = String(m.family_id);
            if (!kkSets[groupIndex].has(familyIdStr)) {
                kkSets[groupIndex].add(familyIdStr);
                s.jumlahKK++;
                if (m.is_duafa) s.jumlahDuafa.keluarga++;
            }
        }
    });

    // Compute totals for each group and for the whole desa
    const desaTotals: any = {
        totalBalita_lDesa: 0, totalBalita_pDesa: 0,
        totalPaud_lDesa: 0, totalPaud_pDesa: 0,
        totalCaberawit_lDesa: 0, totalCaberawit_pDesa: 0,
        totalPraremaja_lDesa: 0, totalPraremaja_pDesa: 0,
        totalRemaja_lDesa: 0, totalRemaja_pDesa: 0,
        totalPraNikah_lDesa: 0, totalPraNikah_pDesa: 0,
        totalMenikah_lDesa: 0, totalMenikah_pDesa: 0,
        totalDudaDesa: 0, totalJandaDesa: 0,
        totalKKDesa: 0, totalDuafaJiwaDesa: 0, totalBinaanLDesa: 0, totalBinaanPDesa: 0
    };

    for (let i = 1; i <= 5; i++) {
        const g = groups[i].metrics;
        const s = groups[i].stats;

        groups[i].totalL = g.balita_l.length + g.paud_l.length + g.caberawit_l.length + g.praremaja_l.length + g.remaja_l.length + g.pranikah_l.length + g.menikah_l.length + g.duda.length;
        groups[i].totalP = g.balita_p.length + g.paud_p.length + g.caberawit_p.length + g.praremaja_p.length + g.remaja_p.length + g.pranikah_p.length + g.menikah_p.length + g.janda.length;
        groups[i].totalAll = groups[i].totalL + groups[i].totalP;

        desaTotals.totalBalita_lDesa += g.balita_l.length;
        desaTotals.totalBalita_pDesa += g.balita_p.length;
        desaTotals.totalPaud_lDesa += g.paud_l.length;
        desaTotals.totalPaud_pDesa += g.paud_p.length;
        desaTotals.totalCaberawit_lDesa += g.caberawit_l.length;
        desaTotals.totalCaberawit_pDesa += g.caberawit_p.length;
        desaTotals.totalPraremaja_lDesa += g.praremaja_l.length;
        desaTotals.totalPraremaja_pDesa += g.praremaja_p.length;
        desaTotals.totalRemaja_lDesa += g.remaja_l.length;
        desaTotals.totalRemaja_pDesa += g.remaja_p.length;
        desaTotals.totalPraNikah_lDesa += g.pranikah_l.length;
        desaTotals.totalPraNikah_pDesa += g.pranikah_p.length;
        desaTotals.totalMenikah_lDesa += g.menikah_l.length;
        desaTotals.totalMenikah_pDesa += g.menikah_p.length;
        desaTotals.totalDudaDesa += g.duda.length;
        desaTotals.totalJandaDesa += g.janda.length;
        desaTotals.totalKKDesa += s.jumlahKK;
        desaTotals.totalDuafaJiwaDesa += s.jumlahDuafa.jiwa;
        desaTotals.totalBinaanLDesa += s.jumlahBinaan.l;
        desaTotals.totalBinaanPDesa += s.jumlahBinaan.p;
    }

    return { groups, desaTotals };
};

// --- KOMPONEN UTAMA ---
const TabelSensus = forwardRef<HTMLDivElement, TableProps>((_) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // For rendering: if groupedData exists use it; otherwise fallback to supabase-processed g1
    const { groups, desaTotals: firebaseDesaTotals } = useMemo(() => processSensusData(members), [members]);

    // fetch firebase members
    useEffect(() => {
        const fetchMembers = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'sensus'), where('is_active', '==', true));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ uuid: doc.id, ...doc.data() }));
                setMembers(data as any as Member[]);
            } catch (err: any) {
                console.error("Gagal ambil data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, []);

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
    const wDuafaCell = '100px';
    const wBinaan = '50px';

    const handleDownloadPDF = async () => {
        if (!printRef.current) return;

        try {
            const { toJpeg } = await import('html-to-image');
            const dataUrl = await toJpeg(printRef.current, {
                cacheBust: true,
                backgroundColor: 'white',
                pixelRatio: 1.5, // Reduced from 2 for better compression
                quality: 0.75,   // Optimized JPEG quality
                width: printRef.current.scrollWidth,
                height: printRef.current.scrollHeight,
                style: { transform: 'none', margin: '0', overflow: 'visible' }
            });

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
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

            pdf.addImage(dataUrl, 'JPEG', xPos, yPos, widthInPdf, heightInPdf, undefined, 'FAST');
            pdf.save(`Laporan_Sensus_${dayjs().format('MMMM_YYYY')}.pdf`);
        } catch (err) {
            console.error('Gagal generate PDF:', err);
            alert('Gagal mendownload PDF. Silakan coba lagi.');
        }
    };

    // Loading UX: if both sources not ready show loader
    const isLoadingAll = loading && !groups;

    if (isLoadingAll) return (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
            <p className="text-slate-500 font-medium">Memuat Data Laporan...</p>
        </div>
    );

    // helper to read value for a group from groups
    const readGroupValue = (groupIndex: number, category: keyof GroupedCategories) => {
        const group = groups[groupIndex];
        if (!group) return 0;
        return group.metrics[category]?.length ?? 0;
    };

    const readGroupTotalL = (groupIndex: number) => groups[groupIndex]?.totalL ?? 0;
    const readGroupTotalP = (groupIndex: number) => groups[groupIndex]?.totalP ?? 0;
    const readGroupTotalAll = (groupIndex: number) => groups[groupIndex]?.totalAll ?? 0;

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
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: '40px' }} rowSpan={3}>NO</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wKelompok }} rowSpan={3}>Kelompok</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Balita</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Paud<br />(Tk)</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Cabe<br />Rawit</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Pra<br />Remaja</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Remaja</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2 }} colSpan={2} rowSpan={2}>Pranikah<br />(Mandiri)</th>
                                <th style={{ ...s.th, backgroundColor: colors.table3 }} colSpan={2} rowSpan={2}>Dewasa<br />(Menikah)</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={2} rowSpan={2}>Jumlah</th>
                                <th style={{ ...s.th, backgroundColor: colors.table4, width: wTotal }} rowSpan={3}>Total</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={6}>Data Keterangan</th>
                            </tr>
                            <tr>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: '40px' }} rowSpan={2}>Dd</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: '40px' }} rowSpan={2}>Jnd</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wKK }} rowSpan={2}>Jml<br />KK</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wDuafaCell }} rowSpan={2}>Du'afa</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1 }} colSpan={2}>Binaan</th>
                            </tr>
                            <tr>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table2, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table3, width: wData }}>L</th><th style={{ ...s.th, backgroundColor: colors.table3, width: wData }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: '50px' }}>L</th><th style={{ ...s.th, backgroundColor: colors.table1, width: '50px' }}>P</th>
                                <th style={{ ...s.th, backgroundColor: colors.table1, width: wBinaan }}>L</th><th style={{ ...s.th, backgroundColor: colors.table1, width: wBinaan }}>P</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map((k, index) => {
                                const group = groups[k];
                                const stats = group?.stats;

                                return (
                                    <tr key={k} style={{ backgroundColor: index % 2 === 0 ? colors.white : 'rgba(0,0,0,0.02)' }}>
                                        <td style={s.td}>{k}.</td>
                                        <td style={s.td}>Klp -{k}</td>
                                        <td style={s.td}>{readGroupValue(k, 'balita_l')}</td><td style={s.td}>{readGroupValue(k, 'balita_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'paud_l')}</td><td style={s.td}>{readGroupValue(k, 'paud_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'caberawit_l')}</td><td style={s.td}>{readGroupValue(k, 'caberawit_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'praremaja_l')}</td><td style={s.td}>{readGroupValue(k, 'praremaja_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'remaja_l')}</td><td style={s.td}>{readGroupValue(k, 'remaja_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'pranikah_l')}</td><td style={s.td}>{readGroupValue(k, 'pranikah_p')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'menikah_l') + readGroupValue(k, 'duda')}</td><td style={s.td}>{readGroupValue(k, 'menikah_p') + readGroupValue(k, 'janda')}</td>
                                        <td style={s.td}>{readGroupTotalL(k)}</td><td style={s.td}>{readGroupTotalP(k)}</td>
                                        <td style={{ ...s.td, backgroundColor: colors.table4, fontWeight: 'bold' }}>{readGroupTotalAll(k)}</td>
                                        <td style={s.td}>{readGroupValue(k, 'duda')}</td>
                                        <td style={s.td}>{readGroupValue(k, 'janda')}</td>
                                        <td style={s.td}>{stats?.jumlahKK ?? 0}</td>
                                        <td style={s.td}>{stats?.jumlahDuafa.jiwa ?? 0}</td>
                                        <td style={s.td}>{stats?.jumlahBinaan.l ?? 0}</td>
                                        <td style={s.td}>{stats?.jumlahBinaan.p ?? 0}</td>
                                    </tr>
                                );
                            })}

                            <tr style={{ backgroundColor: colors.table2, fontWeight: 'bold' }}>
                                <td style={s.td} colSpan={2}>Jumlah</td>
                                <td style={s.td}>{firebaseDesaTotals.totalBalita_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalBalita_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalPaud_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalPaud_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalCaberawit_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalCaberawit_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalPraremaja_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalPraremaja_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalRemaja_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalRemaja_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalPraNikah_lDesa}</td><td style={s.td}>{firebaseDesaTotals.totalPraNikah_pDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalMenikah_lDesa + firebaseDesaTotals.totalDudaDesa}</td><td style={s.td}>{firebaseDesaTotals.totalMenikah_pDesa + firebaseDesaTotals.totalJandaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalBalita_lDesa + firebaseDesaTotals.totalPaud_lDesa + firebaseDesaTotals.totalCaberawit_lDesa + firebaseDesaTotals.totalPraremaja_lDesa + firebaseDesaTotals.totalRemaja_lDesa + firebaseDesaTotals.totalPraNikah_lDesa + firebaseDesaTotals.totalMenikah_lDesa + firebaseDesaTotals.totalDudaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalBalita_pDesa + firebaseDesaTotals.totalPaud_pDesa + firebaseDesaTotals.totalCaberawit_pDesa + firebaseDesaTotals.totalPraremaja_pDesa + firebaseDesaTotals.totalRemaja_pDesa + firebaseDesaTotals.totalPraNikah_pDesa + firebaseDesaTotals.totalMenikah_pDesa + firebaseDesaTotals.totalJandaDesa}</td>
                                <td style={{ ...s.td, backgroundColor: colors.table4 }}>{firebaseDesaTotals.totalBalita_lDesa + firebaseDesaTotals.totalBalita_pDesa + firebaseDesaTotals.totalPaud_lDesa + firebaseDesaTotals.totalPaud_pDesa + firebaseDesaTotals.totalCaberawit_lDesa + firebaseDesaTotals.totalCaberawit_pDesa + firebaseDesaTotals.totalPraremaja_lDesa + firebaseDesaTotals.totalPraremaja_pDesa + firebaseDesaTotals.totalRemaja_lDesa + firebaseDesaTotals.totalRemaja_pDesa + firebaseDesaTotals.totalPraNikah_lDesa + firebaseDesaTotals.totalPraNikah_pDesa + firebaseDesaTotals.totalMenikah_lDesa + firebaseDesaTotals.totalMenikah_pDesa + firebaseDesaTotals.totalDudaDesa + firebaseDesaTotals.totalJandaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalDudaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalJandaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalKKDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalDuafaJiwaDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalBinaanLDesa}</td>
                                <td style={s.td}>{firebaseDesaTotals.totalBinaanPDesa}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '150px', fontFamily: 'Arial, sans-serif' }}>
                        <div style={{ border: '2px solid black', padding: '15px', fontSize: '16px', display: 'flex', gap: '40px', backgroundColor: 'white' }}>
                            <div>
                                <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px' }}>Keterangan</p>
                                <table style={{ border: 'none', fontSize: '16px' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '3px' }}>Balita</td><td style={{ padding: '3px' }}>: 0 - 3 Tahun</td></tr>
                                        <tr><td style={{ padding: '3px' }}>Paud</td><td style={{ padding: '3px' }}>: 4 - 5 Tahun</td></tr>
                                        <tr><td style={{ padding: '3px' }}>Caberawit</td><td style={{ padding: '3px' }}>: 6 - 12 Tahun (SD)</td></tr>
                                        <tr><td style={{ padding: '3px' }}>Pra Remaja</td><td style={{ padding: '3px' }}>: 13 - 15 Tahun (SMP)</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ paddingTop: '28px' }}>
                                <table style={{ border: 'none', fontSize: '16px' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '3px' }}>Remaja</td><td style={{ padding: '3px' }}>: 16 - 18 Tahun (SMA)</td></tr>
                                        <tr><td style={{ padding: '3px' }}>Dewasa</td><td style={{ padding: '3px' }}>: 19 Tahun+ (Belum Nikah)</td></tr>
                                        <tr><td style={{ padding: '3px' }}>L</td><td style={{ padding: '3px' }}>:
                                            Laki - laki</td></tr>
                                        <tr><td style={{ padding: '3px' }}>P</td><td style={{ padding: '3px' }}>:
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
