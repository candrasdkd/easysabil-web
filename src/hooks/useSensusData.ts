import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/client';
import type { Member } from '../types/Member';

export interface SensusMetrics {
    balita_l: Member[]; balita_p: Member[];
    paud_l: Member[]; paud_p: Member[];
    caberawit_l: Member[]; caberawit_p: Member[];
    praremaja_l: Member[]; praremaja_p: Member[];
    remaja_l: Member[]; remaja_p: Member[];
    pranikah_l: Member[]; pranikah_p: Member[];
    menikah_l: Member[]; menikah_p: Member[];
    duda: Member[]; janda: Member[];
}

export interface SheetMember {
    KELOMPOK: string;
    JENJANG: string;
    "JENIS KELAMIN": string;
    "STATUS PERNIKAHAN": string;
    "STATUS PONDOK"?: string;
    "STATUS AKTIF"?: string;
    "NAMA KELUARGA"?: string;
}

export type GroupedCategories = {
    balita_l: (SheetMember | Member)[]; balita_p: (SheetMember | Member)[];
    paud_l: (SheetMember | Member)[]; paud_p: (SheetMember | Member)[];
    caberawit_l: (SheetMember | Member)[]; caberawit_p: (SheetMember | Member)[];
    praremaja_l: (SheetMember | Member)[]; praremaja_p: (SheetMember | Member)[];
    remaja_l: (SheetMember | Member)[]; remaja_p: (SheetMember | Member)[];
    pranikah_l: (SheetMember | Member)[]; pranikah_p: (SheetMember | Member)[];
    menikah_l: (SheetMember | Member)[]; menikah_p: (SheetMember | Member)[];
    duda: (SheetMember | Member)[]; janda: (SheetMember | Member)[];
};

export type GroupedData = {
    kelompok1: GroupedCategories;
    kelompok2: GroupedCategories;
    kelompok3: GroupedCategories;
    kelompok4: GroupedCategories;
    kelompok5: GroupedCategories;
};

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

export const useSensusData = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupedData, setGroupedData] = useState<GroupedData | null>(null);
    const [totalsDesa, setTotalsDesa] = useState<Record<string, number> | null>(null);
    const [countKK, setCountKK] = useState<Record<string, number>>({});
    const [countBinaan, setCountBinaan] = useState<Record<string, { l: number; p: number }>>({});
    const [countDuafa, setCountDuafa] = useState<Record<string, number> | null>(null);

    const fetchSupabaseMembers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('list_sensus')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            if (data) setMembers(data as Member[]);
        } catch (err) {
            console.error("Gagal ambil data Supabase:", err);
        }
    }, []);

    const fetchSheetData = useCallback(async () => {
        try {
            // Fetch everything in parallel
            const [kkRes, binaanRes, duafaRes, sensusRes] = await Promise.all([
                fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent("DATA KK DESA")}`),
                fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent("DATA BINAAN DESA")}`),
                fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent("DATA DUAFA DESA")}`),
                fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${encodeURIComponent("DATA JAMAAH DESA")}`)
            ]);

            const [kkData, binaanData, duafaData, sensusData] = await Promise.all([
                kkRes.json(), binaanRes.json(), duafaRes.json(), sensusRes.json()
            ]);

            // Process KK Data
            const kkGrouped = kkData.reduce((acc: Record<string, SheetMember[]>, item: SheetMember) => {
                const kelompokKey = item.KELOMPOK || 'Tidak Diketahui';
                if (!acc[kelompokKey]) {
                    acc[kelompokKey] = [];
                }
                acc[kelompokKey].push(item);
                return acc;
            }, {} as Record<string, SheetMember[]>);
            setCountKK(Object.keys(kkGrouped).reduce((acc: Record<string, number>, kelompok: string) => {
                acc[kelompok] = kkGrouped[kelompok]?.length ?? 0;
                return acc;
            }, {}));

            // Process Binaan Data
            const processedBinaan: Record<string, { l: number; p: number }> = {
                kelompok1: { l: 0, p: 0 }, kelompok2: { l: 0, p: 0 }, kelompok3: { l: 0, p: 0 }, kelompok4: { l: 0, p: 0 }, kelompok5: { l: 0, p: 0 }
            };
            binaanData.forEach((item: SheetMember) => {
                if (!item.KELOMPOK) {
                    return;
                }
                const key = item.KELOMPOK.toLowerCase().replace(/\s+/g, '');
                const mapKey = `kelompok${key.replace(/[^0-9]/g, '')}`;
                if (!processedBinaan[mapKey]) {
                    return;
                }
                if (item["JENIS KELAMIN"] === 'Laki - Laki') {
                    processedBinaan[mapKey].l++;
                } else if (item["JENIS KELAMIN"] === 'Perempuan') {
                    processedBinaan[mapKey].p++;
                }
            });
            setCountBinaan(processedBinaan);

            // Process Duafa Data
            const duafaResult: Record<string, number> = {
                totalJiwaKelompok1: 0, totalKeluargaKelompok1: 0,
                totalJiwaKelompok2: 0, totalKeluargaKelompok2: 0,
                totalJiwaKelompok3: 0, totalKeluargaKelompok3: 0,
                totalJiwaKelompok4: 0, totalKeluargaKelompok4: 0,
                totalJiwaKelompok5: 0, totalKeluargaKelompok5: 0
            };
            const familyCounts: Record<string, Record<string, boolean>> = {};
            duafaData.forEach((item: SheetMember) => {
                const kelompok = item.KELOMPOK || 'Kelompok 1';
                const groupNum = (kelompok.match(/\d+/)?.[0]) ?? '1';
                const groupKey = `totalJiwaKelompok${groupNum}`;
                const familyGroupKey = `totalKeluargaKelompok${groupNum}`;
                const familyKey = item["NAMA KELUARGA"] || `${Math.random()}`;
                if (duafaResult[groupKey] !== undefined) {
                    duafaResult[groupKey]++;
                }
                if (!familyCounts[kelompok]) {
                    familyCounts[kelompok] = {};
                }
                if (!familyCounts[kelompok][familyKey]) {
                    familyCounts[kelompok][familyKey] = true;
                    if (duafaResult[familyGroupKey] !== undefined) {
                        duafaResult[familyGroupKey]++;
                    }
                }
            });
            setCountDuafa(duafaResult);

            // Process Sensus Data (Grouping)
            const grouped: GroupedData = {
                kelompok1: emptyGroup(), kelompok2: emptyGroup(), kelompok3: emptyGroup(), kelompok4: emptyGroup(), kelompok5: emptyGroup()
            };
            const filteredData = (sensusData || []).filter((item: SheetMember) => {
                const sp = item["STATUS PONDOK"] ?? '';
                const sa = item["STATUS AKTIF"] ?? '';
                return sp !== "Luar Daerah" && sa !== "Tidak Aktif";
            });
            filteredData.forEach((person: SheetMember) => {
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
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.balita_l.push(person);
                            } else {
                                categories.balita_p.push(person);
                            }
                        } else if (JENJANG === "Paud") {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.paud_l.push(person);
                            } else {
                                categories.paud_p.push(person);
                            }
                        } else if (JENJANG === "Caberawit") {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.caberawit_l.push(person);
                            } else {
                                categories.caberawit_p.push(person);
                            }
                        } else if (JENJANG === "Pra Remaja") {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.praremaja_l.push(person);
                            } else {
                                categories.praremaja_p.push(person);
                            }
                        } else if (JENJANG === "Remaja") {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.remaja_l.push(person);
                            } else {
                                categories.remaja_p.push(person);
                            }
                        } else if (JENJANG === "Pra Nikah" || (JENJANG === "Dewasa" && STATUS_PERNIKAHAN === "Belum Menikah")) {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.pranikah_l.push(person);
                            } else {
                                categories.pranikah_p.push(person);
                            }
                        } else if ((JENJANG === "Lansia" && STATUS_PERNIKAHAN === "Menikah") || (JENJANG === "Dewasa" && STATUS_PERNIKAHAN === "Menikah")) {
                            if (JENIS_KELAMIN === "Laki - Laki") {
                                categories.menikah_l.push(person);
                            } else {
                                categories.menikah_p.push(person);
                            }
                        }
                        if (STATUS_PERNIKAHAN === "Janda") categories.janda.push(person);
                        else if (STATUS_PERNIKAHAN === "Duda") categories.duda.push(person);
                    }
                }
            });

            // Compute Totals
            const kelompokKeys = ['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const;
            const totals: Record<string, number> = {};
            const sumFor = (cat: keyof GroupedCategories) =>
                kelompokKeys.reduce((s, g) => s + (grouped[g as keyof GroupedData][cat]?.length || 0), 0);

            const catList: (keyof GroupedCategories)[] = ['balita_l', 'balita_p', 'paud_l', 'paud_p', 'caberawit_l', 'caberawit_p', 'praremaja_l', 'praremaja_p', 'remaja_l', 'remaja_p', 'pranikah_l', 'pranikah_p', 'menikah_l', 'menikah_p', 'duda', 'janda'];
            catList.forEach(cat => {
                const totalKey = `total${cat.charAt(0).toUpperCase()}${cat.slice(1).replace('_', '')}Desa`;
                // special cases for naming consistency with old code
                let key = totalKey;
                if (cat === 'pranikah_l') key = 'totalPraNikah_lDesa';
                if (cat === 'pranikah_p') key = 'totalPraNikah_pDesa';
                if (cat === 'duda') key = 'totalDudaDesa';
                if (cat === 'janda') key = 'totalJandaDesa';
                totals[key] = sumFor(cat);
            });

            setGroupedData(grouped);
            setTotalsDesa(totals);
        } catch (err) {
            console.error("Gagal ambil data SheetDB:", err);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchSupabaseMembers(), fetchSheetData()]).finally(() => setLoading(false));
    }, [fetchSupabaseMembers, fetchSheetData]);

    // Supabase processing (legacy/fallback)
    const supabaseStats = useMemo(() => {
        const metrics = createEmptyMetrics();
        const stats = { jumlahKK: 0, jumlahDuafa: { keluarga: 0, jiwa: 0 }, jumlahBinaan: { l: 0, p: 0 } };
        const kkSet = new Set<string>();

        members.forEach(m => {
            const gender = (m.gender || '').toLowerCase().trim();
            const isLaki = gender === 'laki - laki' || gender === 'Laki - Laki';
            const status = (m.marriage_status || '').toLowerCase().trim();
            const level = (m.level || '').toLowerCase().trim();

            if (status === 'menikah') {
                if (isLaki) {
                    metrics.menikah_l.push(m);
                } else {
                    metrics.menikah_p.push(m);
                }
            } else if (status === 'duda') {
                metrics.duda.push(m);
            } else if (status === 'janda') {
                metrics.janda.push(m);
            } else {
                if (level.includes('batita')) {
                    if (isLaki) {
                        metrics.balita_l.push(m);
                    } else {
                        metrics.balita_p.push(m);
                    }
                } else if (level.includes('paud')) {
                    if (isLaki) {
                        metrics.paud_l.push(m);
                    } else {
                        metrics.paud_p.push(m);
                    }
                } else if (level.includes('cabe rawit')) {
                    if (isLaki) {
                        metrics.caberawit_l.push(m);
                    } else {
                        metrics.caberawit_p.push(m);
                    }
                } else if (level.includes('pra remaja')) {
                    if (isLaki) {
                        metrics.praremaja_l.push(m);
                    } else {
                        metrics.praremaja_p.push(m);
                    }
                } else if (level.includes('remaja')) {
                    if (isLaki) {
                        metrics.remaja_l.push(m);
                    } else {
                        metrics.remaja_p.push(m);
                    }
                } else if (level.includes('pra nikah') || (level.includes('dewasa') && status === 'belum menikah')) {
                    if (isLaki) {
                        metrics.pranikah_l.push(m);
                    } else {
                        metrics.pranikah_p.push(m);
                    }
                }
            }

            if (m.is_educate) {
                if (isLaki) {
                    stats.jumlahBinaan.l++;
                } else {
                    stats.jumlahBinaan.p++;
                }
            }
            if (m.is_duafa) {
                stats.jumlahDuafa.jiwa++;
            }
            if (m.id_family && m.family_name !== 'Rantau') {
                const familyIdStr = String(m.id_family);
                if (!kkSet.has(familyIdStr)) {
                    kkSet.add(familyIdStr);
                    stats.jumlahKK++;
                    if (m.is_duafa) stats.jumlahDuafa.keluarga++;
                }
            }
        });

        const totalL = metrics.balita_l.length + metrics.paud_l.length + metrics.caberawit_l.length + metrics.praremaja_l.length + metrics.remaja_l.length + metrics.pranikah_l.length + metrics.menikah_l.length + metrics.duda.length;
        const totalP = metrics.balita_p.length + metrics.paud_p.length + metrics.caberawit_p.length + metrics.praremaja_p.length + metrics.remaja_p.length + metrics.pranikah_p.length + metrics.menikah_p.length + metrics.janda.length;

        return { metrics, stats, totalL, totalP, totalAll: totalL + totalP };
    }, [members]);

    return {
        loading,
        groupedData,
        totalsDesa,
        countKK,
        countBinaan,
        countDuafa,
        supabaseStats
    };
};
