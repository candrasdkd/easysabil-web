import { forwardRef, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TableProps {
    jumlahJenjang: any;
    jumlahKK: Record<string, number>;
    jumlahDuafa: Record<string, number>;
    jumlahBinaan: any;
    loading: boolean;
}

const TabelSensus = forwardRef<HTMLDivElement, TableProps>(({ jumlahJenjang, jumlahKK, jumlahDuafa, jumlahBinaan, loading }, ref) => {
    // We'll use a local ref to ensure we can always access the div
    const contentRef = useRef<HTMLDivElement>(null);

    const handleDownloadPDF = () => {
        const input = (ref as React.RefObject<HTMLDivElement>)?.current || contentRef.current;
        if (input) {
            // Opsi untuk meningkatkan kualitas gambar
            html2canvas(input, { scale: 2, useCORS: true })
                .then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');

                    // Gunakan orientasi landscape ('l'), unit 'pt', dan format 'a4'
                    const pdf = new jsPDF('l', 'pt', 'a4');

                    // Dapatkan dimensi halaman PDF
                    const pdfWidth = pdf.internal.pageSize.getWidth();

                    // Dapatkan dimensi gambar dari canvas
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;

                    // Hitung rasio aspek gambar untuk menghindari distorsi
                    const ratio = canvasWidth / canvasHeight;

                    // Skalakan gambar agar sesuai dengan LEBAR PDF
                    const widthInPdf = pdfWidth - 40; // Beri sedikit margin 20pt di kiri dan kanan
                    const heightInPdf = widthInPdf / ratio;

                    const xPosition = 20; // Posisi X dengan margin 20pt
                    const yPosition = 20; // Posisi Y dengan margin 20pt

                    // Tambahkan gambar ke PDF dengan dimensi yang sudah dihitung
                    pdf.addImage(imgData, 'PNG', xPosition, yPosition, widthInPdf, heightInPdf);
                    pdf.save('laporan-sensus.pdf');
                });
        }
    };

    if (loading) {
        const jumlahKartuKeluargaK1 = jumlahKK["Kelompok 1"] ? jumlahKK["Kelompok 1"] : 0;
        const jumlahKartuKeluargaK2 = jumlahKK["Kelompok 2"] ? jumlahKK["Kelompok 2"] : 0;
        const jumlahKartuKeluargaK3 = jumlahKK["Kelompok 3"] ? jumlahKK["Kelompok 3"] : 0;
        const jumlahKartuKeluargaK4 = jumlahKK["Kelompok 4"] ? jumlahKK["Kelompok 4"] : 0;
        const jumlahKartuKeluargaK5 = jumlahKK["Kelompok 5"] ? jumlahKK["Kelompok 5"] : 0;

        const jumlahBinaanKelompok1 = jumlahBinaan?.kelompok1.l + jumlahBinaan?.kelompok1.p;
        const jumlahBinaanKelompok2 = jumlahBinaan?.kelompok2.l + jumlahBinaan?.kelompok2.p;
        const jumlahBinaanKelompok3 = jumlahBinaan?.kelompok3.l + jumlahBinaan?.kelompok3.p;
        const jumlahBinaanKelompok4 = jumlahBinaan?.kelompok4.l + jumlahBinaan?.kelompok4.p;
        const jumlahBinaanKelompok5 = jumlahBinaan?.kelompok5.l + jumlahBinaan?.kelompok5.p;
        const jumlahBinaanLaki = jumlahBinaan?.kelompok1.l + jumlahBinaan?.kelompok2.l + jumlahBinaan?.kelompok3.l + jumlahBinaan?.kelompok4.l + jumlahBinaan?.kelompok5.l;
        const jumlahBinaanPerempuan = jumlahBinaan?.kelompok1.p + jumlahBinaan?.kelompok2.p + jumlahBinaan?.kelompok3.p + jumlahBinaan?.kelompok4.p + jumlahBinaan?.kelompok5.p;
        const totalKeluargaDuafa = jumlahDuafa?.totalKeluargaKelompok1 + jumlahDuafa?.totalKeluargaKelompok2 + jumlahDuafa?.totalKeluargaKelompok3 + jumlahDuafa?.totalKeluargaKelompok4 + jumlahDuafa?.totalKeluargaKelompok5;
        const totalJiwaDuafa = jumlahDuafa?.totalJiwaKelompok1 + jumlahDuafa?.totalJiwaKelompok2 + jumlahDuafa?.totalJiwaKelompok3 + jumlahDuafa?.totalJiwaKelompok4 + jumlahDuafa?.totalJiwaKelompok5;
        const totalLakiDesa = jumlahJenjang?.totalBalita_lDesa + jumlahJenjang?.totalPaud_lDesa + jumlahJenjang?.totalCaberawit_lDesa + jumlahJenjang?.totalPraremaja_lDesa + jumlahJenjang?.totalRemaja_lDesa + jumlahJenjang?.totalPraNikah_lDesa + jumlahJenjang?.totalMenikah_lDesa + jumlahJenjang?.totalDudaDesa;
        const totalPerempuanDesa = jumlahJenjang?.totalBalita_pDesa + jumlahJenjang?.totalPaud_pDesa + jumlahJenjang?.totalCaberawit_pDesa + jumlahJenjang?.totalPraremaja_pDesa + jumlahJenjang?.totalRemaja_pDesa + jumlahJenjang?.totalPraNikah_pDesa + jumlahJenjang?.totalMenikah_pDesa + jumlahJenjang?.totalJandaDesa;
        const totalKeseluruhanKK = jumlahKartuKeluargaK1 + jumlahKartuKeluargaK2 + jumlahKartuKeluargaK3 + jumlahKartuKeluargaK4 + jumlahKartuKeluargaK5;
        const totalKeselurhanSensus = jumlahJenjang?.totalKeseluruhanKelompok1 + jumlahJenjang?.totalKeseluruhanKelompok2 + jumlahJenjang?.totalKeseluruhanKelompok3 + jumlahJenjang?.totalKeseluruhanKelompok4 + jumlahJenjang?.totalKeseluruhanKelompok5;

        return (
            <div>
                <div style={{ textAlign: 'center', margin: '20px' }}>
                    <button
                        onClick={handleDownloadPDF}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px'
                        }}
                    >
                        Download as PDF
                    </button>
                </div>
                {/* Assign the local ref to this div */}
                <div ref={(node) => {
                    contentRef.current = node;
                    if (typeof ref === 'function') {
                        ref(node);
                    } else if (ref) {
                        ref.current = node;
                    }
                }}>
                    <table style={{ borderCollapse: 'collapse', margin: 'auto' }}>
                        {/* THE REST OF YOUR TABLE JSX REMAINS UNCHANGED */}
                        <thead>
                            <tr>
                                <th colSpan={25} style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <h3 style={{ margin: 0 }}>DAFTAR SENSUS DESA KELAPA DUA</h3>
                                    <h3 style={{ margin: 0 }}>BULAN {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                                </th>
                            </tr>
                            <tr style={{ fontSize: 14, border: '1px solid black', }}>
                                <th style={{ border: '1px solid black' }} className='color-table-1' rowSpan={3}>Kelompok</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={12}>Belum Menikah</th>
                                <th style={{ border: '1px solid black' }} className='color-table-3' colSpan={2} rowSpan={2}>Menikah</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' colSpan={2} rowSpan={2}>Duda / Janda</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' colSpan={2} rowSpan={2}>Jumlah</th>
                                <th style={{ border: '1px solid black' }} className='color-table-4' rowSpan={3}>Total</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' rowSpan={3}>
                                    Jumlah <br /> KK
                                </th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' rowSpan={3}>Duafa</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' colSpan={2} rowSpan={2}>Binaan</th>
                            </tr>
                            <tr style={{ fontSize: 14, border: '1px solid black' }}>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Balita</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Paud</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Caberawit</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Pra Remaja</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Remaja</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' colSpan={2}>Dewasa</th>
                            </tr>
                            <tr style={{ fontSize: 14, border: '1px solid black' }}>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-2' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-3' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-3' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >P</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >L</th>
                                <th style={{ border: '1px solid black' }} className='color-table-1' >P</th>

                            </tr>
                        </thead>
                        <tbody style={{ fontSize: 14, border: '1px solid black', textAlign: 'center' }}>
                            <tr style={{ border: '1px solid black' }}>
                                <td style={{ border: '1px solid black', width: 100, height: 20 }}>Kelompok 1</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.balita_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.balita_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.paud_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.paud_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.caberawit_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.caberawit_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.praremaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.praremaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.remaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.remaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.pranikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.pranikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.menikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.menikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.duda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok1.janda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalLakiKelompok1}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalPerempuanKelompok1}</td>
                                <td rowSpan={2} className='color-table-4' style={{ border: '1px solid black', width: 50, fontWeight: 'bold' }}>{jumlahJenjang.totalKeseluruhanKelompok1}</td>
                                <td rowSpan={2} style={{ border: '1px solid black', width: 50 }}>{jumlahKartuKeluargaK1}</td>
                                <td rowSpan={10} style={{ border: '1px solid black', width: 60 }}>
                                    {totalKeluargaDuafa} KK <br />
                                    {totalJiwaDuafa} Jiwa <br />
                                    ---- <br />
                                    Kel 1: {jumlahDuafa.totalJiwaKelompok1}<br />
                                    Kel 2: {jumlahDuafa.totalJiwaKelompok2}<br />
                                    Kel 3: {jumlahDuafa.totalJiwaKelompok3}<br />
                                    Kel 4: {jumlahDuafa.totalJiwaKelompok4}<br />
                                    Kel 5: {jumlahDuafa.totalJiwaKelompok5}<br />
                                </td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok1.l}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok1.p}</td>
                            </tr>
                            <tr style={{ border: '1px solid black' }}>
                                <td style={{ border: '1px solid black', height: 20 }} className='color-table-5'>Jumlah</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalitaLKelompok1 + jumlahJenjang.totalBalitaPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaudLKelompok1 + jumlahJenjang.totalPaudPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCabeRawitLKelompok1 + jumlahJenjang.totalCabeRawitPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraRemajaLKelompok1 + jumlahJenjang.totalPraRemajaPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemajaLKelompok1 + jumlahJenjang.totalRemajaPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikahLKelompok1 + jumlahJenjang.totalPraNikahPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikahLKelompok1 + jumlahJenjang.totalMenikahPKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaKelompok1 + jumlahJenjang.totalJandaKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalLakiKelompok1 + jumlahJenjang.totalPerempuanKelompok1}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanKelompok1}</td>
                            </tr>

                            <tr style={{ border: '1px solid black', }}>
                                <td style={{ border: '1px solid black', width: 100, height: 20 }}>Kelompok 2</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.balita_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.balita_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.paud_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.paud_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.caberawit_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.caberawit_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.praremaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.praremaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.remaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.remaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.pranikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.pranikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.menikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.menikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.duda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok2.janda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalLakiKelompok2}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalPerempuanKelompok2}</td>
                                <td rowSpan={2} className='color-table-4' style={{ border: '1px solid black', width: 50, fontWeight: 'bold' }}>{jumlahJenjang.totalKeseluruhanKelompok2}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }}>{jumlahKartuKeluargaK2}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok2.l}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok2.p}</td>
                            </tr>
                            <tr style={{ textAlign: 'center' }}>
                                <td style={{ border: '1px solid black', height: 20 }} className='color-table-5'>Jumlah</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalitaLKelompok2 + jumlahJenjang.totalBalitaPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaudLKelompok2 + jumlahJenjang.totalPaudPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCabeRawitLKelompok2 + jumlahJenjang.totalCabeRawitPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraRemajaLKelompok2 + jumlahJenjang.totalPraRemajaPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemajaLKelompok2 + jumlahJenjang.totalRemajaPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikahLKelompok2 + jumlahJenjang.totalPraNikahPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikahLKelompok2 + jumlahJenjang.totalMenikahPKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaKelompok2 + jumlahJenjang.totalJandaKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalLakiKelompok2 + jumlahJenjang.totalPerempuanKelompok2}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanKelompok2}</td>
                            </tr>

                            <tr style={{ border: '1px solid black' }}>
                                <td style={{ border: '1px solid black', width: 100, height: 20 }}>Kelompok 3</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.balita_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.balita_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.paud_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.paud_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.caberawit_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.caberawit_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.praremaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.praremaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.remaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.remaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.pranikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.pranikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.menikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.menikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.duda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok3.janda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalLakiKelompok3}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalPerempuanKelompok3}</td>
                                <td rowSpan={2} className='color-table-4' style={{ border: '1px solid black', width: 50, fontWeight: 'bold' }}>{jumlahJenjang.totalKeseluruhanKelompok3}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }}>{jumlahKartuKeluargaK3}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok3.l}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok3.p}</td>
                            </tr>
                            <tr style={{ textAlign: 'center' }}>
                                <td style={{ border: '1px solid black', height: 20 }} className='color-table-5'>Jumlah</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalitaLKelompok3 + jumlahJenjang.totalBalitaPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaudLKelompok3 + jumlahJenjang.totalPaudPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCabeRawitLKelompok3 + jumlahJenjang.totalCabeRawitPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraRemajaLKelompok3 + jumlahJenjang.totalPraRemajaPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemajaLKelompok3 + jumlahJenjang.totalRemajaPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikahLKelompok3 + jumlahJenjang.totalPraNikahPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikahLKelompok3 + jumlahJenjang.totalMenikahPKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaKelompok3 + jumlahJenjang.totalJandaKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalLakiKelompok3 + jumlahJenjang.totalPerempuanKelompok3}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanKelompok3}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', width: 100, height: 20 }}>Kelompok 4</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.balita_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.balita_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.paud_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.paud_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.caberawit_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.caberawit_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.praremaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.praremaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.remaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.remaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.pranikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.pranikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.menikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.menikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.duda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok4.janda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalLakiKelompok4}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalPerempuanKelompok4}</td>
                                <td rowSpan={2} className='color-table-4' style={{ border: '1px solid black', width: 50, fontWeight: 'bold' }}>{jumlahJenjang.totalKeseluruhanKelompok4}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }}>{jumlahKartuKeluargaK4}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok4.l}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok4.p}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', height: 20 }} className='color-table-5'>Jumlah</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalitaLKelompok4 + jumlahJenjang.totalBalitaPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaudLKelompok4 + jumlahJenjang.totalPaudPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCabeRawitLKelompok4 + jumlahJenjang.totalCabeRawitPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraRemajaLKelompok4 + jumlahJenjang.totalPraRemajaPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemajaLKelompok4 + jumlahJenjang.totalRemajaPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikahLKelompok4 + jumlahJenjang.totalPraNikahPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikahLKelompok4 + jumlahJenjang.totalMenikahPKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaKelompok4 + jumlahJenjang.totalJandaKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalLakiKelompok4 + jumlahJenjang.totalPerempuanKelompok4}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanKelompok4}</td>
                            </tr>

                            <tr>
                                <td style={{ border: '1px solid black', width: 100, height: 20 }}>Kelompok 5</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.balita_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.balita_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.paud_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.paud_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.caberawit_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.caberawit_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.praremaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.praremaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.remaja_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.remaja_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.pranikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.pranikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.menikah_l.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.menikah_p.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.duda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.kelompok5.janda.length}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalLakiKelompok5}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahJenjang.totalPerempuanKelompok5}</td>
                                <td rowSpan={2} className='color-table-4' style={{ border: '1px solid black', width: 50, fontWeight: 'bold' }}>{jumlahJenjang.totalKeseluruhanKelompok5}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }}>{jumlahKartuKeluargaK5}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok5.l}</td>
                                <td style={{ border: '1px solid black' }}>{jumlahBinaan?.kelompok5.p}</td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid black', height: 20 }} className='color-table-5'>Jumlah</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalitaLKelompok5 + jumlahJenjang.totalBalitaPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaudLKelompok5 + jumlahJenjang.totalPaudPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCabeRawitLKelompok5 + jumlahJenjang.totalCabeRawitPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraRemajaLKelompok5 + jumlahJenjang.totalPraRemajaPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemajaLKelompok5 + jumlahJenjang.totalRemajaPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikahLKelompok5 + jumlahJenjang.totalPraNikahPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikahLKelompok5 + jumlahJenjang.totalMenikahPKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaKelompok5 + jumlahJenjang.totalJandaKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalLakiKelompok5 + jumlahJenjang.totalPerempuanKelompok5}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanKelompok5}</td>
                            </tr>

                            <tr style={{ fontWeight: 'bold' }}>
                                <td className='color-table-4' style={{ border: '1px solid black', height: 20 }}>Jumlah L/P</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalBalita_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalBalita_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPaud_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPaud_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalCaberawit_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalCaberawit_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPraremaja_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPraremaja_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalRemaja_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalRemaja_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPraNikah_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalPraNikah_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalMenikah_lDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalMenikah_pDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalDudaDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahJenjang.totalJandaDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{totalLakiDesa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{totalPerempuanDesa}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }} className='color-table-4'>{totalKeselurhanSensus}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }} className='color-table-4'>{totalKeseluruhanKK}</td>
                                <td rowSpan={2} style={{ border: '1px solid black' }} className='color-table-4'>{totalJiwaDuafa}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahBinaanLaki}</td>
                                <td style={{ border: '1px solid black' }} className='color-table-4'>{jumlahBinaanPerempuan}</td>
                            </tr>
                            <tr style={{ fontWeight: "bold" }}>
                                <td style={{ textAlign: 'center', border: '1px solid black', height: 20 }} className='color-table-5'>Total</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalBalita_lDesa + jumlahJenjang.totalBalita_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPaud_lDesa + jumlahJenjang.totalPaud_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalCaberawit_lDesa + jumlahJenjang.totalCaberawit_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraremaja_lDesa + jumlahJenjang.totalPraremaja_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalRemaja_lDesa + jumlahJenjang.totalRemaja_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalPraNikah_lDesa + jumlahJenjang.totalPraNikah_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalMenikah_lDesa + jumlahJenjang.totalMenikah_pDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahJenjang.totalDudaDesa + jumlahJenjang.totalJandaDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{totalLakiDesa + totalPerempuanDesa}</td>
                                <td colSpan={2} style={{ border: '1px solid black', width: 80 }} className='color-table-5'>{jumlahBinaanLaki + jumlahBinaanPerempuan}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 50, paddingLeft: 50, paddingRight: 100 }}>
                        <div style={{ border: '1px solid black', padding: 5 }}>
                            <p style={{ padding: 0, margin: 0, fontWeight: 'bold', textDecoration: 'underline', marginBottom: 10 }}>Keterangan</p>
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Balita</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Paud</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Caberawit</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Pra Remaja</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Remaja</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Dewasa</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>L</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>P</p>
                                </div>
                                <div style={{ marginLeft: 20 }}>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>:</p>
                                </div>
                                <div style={{ marginLeft: 20 }}>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>0 - 3 Tahun</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>4 - 5 Tahun</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>6/7 - 12/13 Tahun (SD)</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>12/13 - 15/16 Tahun (SMP)</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>15/16 - 18/19 Tahun (SMA)</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>18/19 Tahun keatas (Belum Nikah)</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Laki - laki</p>
                                    <p style={{ padding: 0, margin: 0, marginTop: 5, fontSize: 12 }}>Perempuan</p>
                                </div>
                            </div>

                        </div>
                        <div >
                            <p>Depok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                            <p style={{ padding: 0, margin: 0, marginTop: 100, textDecoration: 'underline' }}>H. Sulaiman</p>
                            <p style={{ padding: 0, margin: 0, marginTop: 10, fontWeight: 'bold' }}>KI Desa</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null

});

export default TabelSensus;