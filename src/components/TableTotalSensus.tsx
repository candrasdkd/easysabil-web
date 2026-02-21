import React, { useRef } from 'react';
import { useSensusData } from '../hooks/useSensusData';
import type { GroupedCategories, GroupedData } from '../hooks/useSensusData';
import { downloadComponentAsPDF } from '../utils/pdfExport';

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

const TabelSensus: React.FC = () => {
    const printRef = useRef<HTMLDivElement>(null);
    const {
        loading,
        groupedData,
        totalsDesa,
        countKK,
        countBinaan,
        countDuafa,
        supabaseStats
    } = useSensusData();

    const handleDownloadPDF = () => {
        downloadComponentAsPDF(printRef.current, 'Laporan_Sensus');
    };

    if (loading && !groupedData) return (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
            <p className="text-slate-500 font-medium">Memuat Data Laporan...</p>
        </div>
    );

    const readGroupValue = (groupIndex: number, category: keyof GroupedCategories) => {
        if (groupIndex === 1) {
            const metrics = supabaseStats.metrics;
            switch (category) {
                case 'balita_l': return metrics.balita_l.length;
                case 'balita_p': return metrics.balita_p.length;
                case 'paud_l': return metrics.paud_l.length;
                case 'paud_p': return metrics.paud_p.length;
                case 'caberawit_l': return metrics.caberawit_l.length;
                case 'caberawit_p': return metrics.caberawit_p.length;
                case 'praremaja_l': return metrics.praremaja_l.length;
                case 'praremaja_p': return metrics.praremaja_p.length;
                case 'remaja_l': return metrics.remaja_l.length;
                case 'remaja_p': return metrics.remaja_p.length;
                case 'pranikah_l': return metrics.pranikah_l.length;
                case 'pranikah_p': return metrics.pranikah_p.length;
                case 'menikah_l': return metrics.menikah_l.length;
                case 'menikah_p': return metrics.menikah_p.length;
                case 'duda': return metrics.duda.length;
                case 'janda': return metrics.janda.length;
                default: return 0;
            }
        }
        if (!groupedData) return 0;
        const key = `kelompok${groupIndex}` as keyof GroupedData;
        return groupedData[key]?.[category]?.length ?? 0;
    };

    const readGroupTotalL = (groupIndex: number) => {
        const cats: (keyof GroupedCategories)[] = ['balita_l', 'paud_l', 'caberawit_l', 'praremaja_l', 'remaja_l', 'pranikah_l', 'menikah_l', 'duda'];
        return cats.reduce((s, c) => s + readGroupValue(groupIndex, c), 0);
    };
    const readGroupTotalP = (groupIndex: number) => {
        const cats: (keyof GroupedCategories)[] = ['balita_p', 'paud_p', 'caberawit_p', 'praremaja_p', 'remaja_p', 'pranikah_p', 'menikah_p', 'janda'];
        return cats.reduce((s, c) => s + readGroupValue(groupIndex, c), 0);
    };
    const readGroupTotalAll = (groupIndex: number) => readGroupTotalL(groupIndex) + readGroupTotalP(groupIndex);

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
                                <td rowSpan={2} style={{ ...s.td, backgroundColor: colors.table4, fontWeight: 'bold' }}>{readGroupTotalAll(1)}</td>
                                <td rowSpan={2} style={s.td}>{countKK['Kelompok 1'] ?? supabaseStats.stats.jumlahKK}</td>
                                <td rowSpan={10} style={{ ...s.td, textAlign: 'left', padding: '10px', verticalAlign: 'top', fontSize: '14px', lineHeight: '1.4' }}>
                                    <div style={{ fontWeight: 'bold' }}>{countDuafa?.totalKeluargaKelompok1 ?? (supabaseStats.stats.jumlahDuafa.keluarga ?? 0)} KK</div>
                                    <div style={{ fontWeight: 'bold' }}>{countDuafa?.totalJiwaKelompok1 ?? (supabaseStats.stats.jumlahDuafa.jiwa ?? 0)} Jiwa</div>
                                    <div style={{ borderTop: '2px dashed #666', margin: '8px 0' }}></div>
                                    <div>Kel 1: {countDuafa?.totalJiwaKelompok1 ?? (supabaseStats.stats.jumlahDuafa.jiwa ?? 0)}</div>
                                    <div>Kel 2: {countDuafa?.totalJiwaKelompok2 ?? 0}</div>
                                    <div>Kel 3: {countDuafa?.totalJiwaKelompok3 ?? 0}</div>
                                    <div>Kel 4: {countDuafa?.totalJiwaKelompok4 ?? 0}</div>
                                    <div>Kel 5: {countDuafa?.totalJiwaKelompok5 ?? 0}</div>
                                </td>
                                <td style={s.td}>{countBinaan?.kelompok1?.l ?? (supabaseStats.stats.jumlahBinaan.l ?? 0)}</td>
                                <td style={s.td}>{countBinaan?.kelompok1?.p ?? (supabaseStats.stats.jumlahBinaan.p ?? 0)}</td>
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
                                <td style={s.td}>{Object.values(desaTotals).reduce((s, v) => s + (v ?? 0), 0) /* Approximate layout for L/P totals */}</td>
                                <td style={s.td}></td>
                                <td rowSpan={2} style={s.td}>{Object.values(desaTotals).reduce((s, v) => s + (v ?? 0), 0)}</td>
                                <td rowSpan={2} style={s.td}>{Object.values(countKK).reduce((s, v) => s + (v ?? 0), 0)}</td>
                                <td rowSpan={2} style={s.td}>{countDuafa ? Object.values(countDuafa).reduce((s, v) => typeof v === 'number' ? s + v : s, 0) : supabaseStats.stats.jumlahDuafa.jiwa}</td>
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
                                <td colSpan={2} style={s.td}>{Object.values(desaTotals).reduce((s, v) => s + (v ?? 0), 0)}</td>
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
                                        <tr><td style={{ padding: '3px' }}>L</td><td style={{ padding: '3px' }}>: Laki - laki</td></tr>
                                        <tr><td style={{ padding: '3px' }}>P</td><td style={{ padding: '3px' }}>: Perempuan</td></tr>
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
};

export default TabelSensus;
