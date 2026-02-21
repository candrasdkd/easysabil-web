import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import dayjs from 'dayjs';

/**
 * Utility to download a React component ref as a PDF table
 */
export const downloadComponentAsPDF = async (
    element: HTMLElement | null,
    filenamePrefix: string = 'Laporan'
) => {
    if (!element) return;

    try {
        const dataUrl = await toPng(element, {
            cacheBust: true,
            backgroundColor: 'white',
            pixelRatio: 2,
            width: element.scrollWidth,
            height: element.scrollHeight,
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
        const dateStr = dayjs().format('MMMM_YYYY');
        pdf.save(`${filenamePrefix}_${dateStr}.pdf`);
    } catch (err) {
        console.error('Gagal generate PDF:', err);
        throw err;
    }
};
