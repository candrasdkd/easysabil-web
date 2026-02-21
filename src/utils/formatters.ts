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
