import dayjs from 'dayjs';

/**
 * Formats a number or string as Indonesian Rupiah currency
 */
export const formatRupiah = (n: string | number): string => {
    const num = typeof n === "string" ? parseInt(n.replace(/[^0-9-]/g, ""), 10) || 0 : Number(n) || 0;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(num);
};

/**
 * Formats a date of birth into human-readable years and months
 */
export const formatAge = (dob: string | null | undefined): string => {
    if (!dob) return '-';
    const birthDate = dayjs(dob);
    const today = dayjs();
    if (birthDate.isAfter(today)) return '-';

    const years = today.diff(birthDate, 'year');
    const months = today.diff(birthDate.add(years, 'year'), 'month');

    if (years === 0 && months === 0) return '< 1 Bulan';
    if (years === 0) return `${months} Bulan`;
    if (months === 0) return `${years} Tahun`;
    return `${years} Tahun ${months} Bulan`;
};

/**
 * Sanitizes string to prevent Excel/CSV formula injection
 */
export const sanitizeExcelInput = (val: unknown): string => {
    const s = String(val ?? '').trim();
    if (/^[=+\-@]/.test(s)) {
        return `'${s}`;
    }
    return s;
};
