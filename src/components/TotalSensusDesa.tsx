import { useState } from 'react';
import TableSensus from './TableTotalSensus';
interface ProcessedData {
    totalJiwaKelompok1: number;
    totalKeluargaKelompok1: number;
    totalJiwaKelompok2: number;
    totalKeluargaKelompok2: number;
    totalJiwaKelompok3: number;
    totalKeluargaKelompok3: number;
    totalJiwaKelompok4: number;
    totalKeluargaKelompok4: number;
    totalJiwaKelompok5: number;
    totalKeluargaKelompok5: number;
}
const TotalSensus = () => {
    const [isSuccess, setIsSuccess] = useState(false)
    const [countKK, setCountKK] = useState({})
    const [countJenjang, setCountJenjang] = useState({})
    const [countDuafa, setCountDuafa] = useState({})
    const [countBinaan, setCountBinaan] = useState({
        kelompok1: { l: 0, p: 0 },
        kelompok2: { l: 0, p: 0 },
        kelompok3: { l: 0, p: 0 },
        kelompok4: { l: 0, p: 0 },
        kelompok5: { l: 0, p: 0 }
    })
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true)
        try {
            await downloadDataKK()
            await downloadDataDuafa()
            await downloadDataBinaan()
            await downloadDataSensus()
            setIsSuccess(true)
        } catch (error: any) {
            alert(error)
            setIsSuccess(false)
        } finally {
            setLoading(false)
        }

    };

    const downloadDataKK = async () => {
        const params = "DATA KK DESA"
        await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${params}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                const groupedData = data.reduce((acc: Record<string, any[]>, item: any) => {
                    const kelompokKey = item.KELOMPOK || 'Tidak Diketahui'; // Menangani kasus di mana item.KELOMPOK mungkin undefined atau null
                    if (!acc[kelompokKey]) {
                        acc[kelompokKey] = [];
                    }
                    acc[kelompokKey].push(item);
                    return acc;
                }, {})
                const kelompokCounts = Object.keys(groupedData).reduce((acc: Record<string, number>, kelompok: string) => {
                    acc[kelompok] = groupedData[kelompok].length ? groupedData[kelompok].length : 0;
                    return acc;
                }, {});
                setCountKK(kelompokCounts);
            })
            .catch((error: any) => {
                return error
            });
    }

    const downloadDataBinaan = async () => {
        const params = "DATA BINAAN DESA"
        await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${params}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                const processedData: { [key: string]: { l: number, p: number } } = {
                    kelompok1: { l: 0, p: 0 },
                    kelompok2: { l: 0, p: 0 },
                    kelompok3: { l: 0, p: 0 },
                    kelompok4: { l: 0, p: 0 },
                    kelompok5: { l: 0, p: 0 }
                };
                data.forEach((item: { KELOMPOK: string, "JENIS KELAMIN": string }) => {
                    const kelompok = item.KELOMPOK.toLowerCase().replace(' ', '');
                    if (!processedData[kelompok]) {
                        processedData[kelompok] = { l: 0, p: 0 };
                    }
                    if (item["JENIS KELAMIN"] === 'Laki - Laki') {
                        processedData[kelompok].l++;
                    } else if (item["JENIS KELAMIN"] === 'Perempuan') {
                        processedData[kelompok].p++;
                    }
                });
                setCountBinaan({
                    kelompok1: processedData.kelompok1,
                    kelompok2: processedData.kelompok2,
                    kelompok3: processedData.kelompok3,
                    kelompok4: processedData.kelompok4,
                    kelompok5: processedData.kelompok5
                });
            })
            .catch((error: any) => {
                return error
            });
    }

    const downloadDataDuafa = async () => {
        const params = "DATA DUAFA DESA"
        await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${params}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                const result: ProcessedData = {
                    totalJiwaKelompok1: 0,
                    totalKeluargaKelompok1: 0,
                    totalJiwaKelompok2: 0,
                    totalKeluargaKelompok2: 0,
                    totalJiwaKelompok3: 0,
                    totalKeluargaKelompok3: 0,
                    totalJiwaKelompok4: 0,
                    totalKeluargaKelompok4: 0,
                    totalJiwaKelompok5: 0,
                    totalKeluargaKelompok5: 0
                };
                const familyCounts: { [key: string]: { [family: string]: boolean } } = {};

                data.forEach((item: any) => {
                    const groupKey = `totalJiwa${item.KELOMPOK.replace(" ", "")}` as keyof ProcessedData;
                    const familyGroupKey = `totalKeluarga${item.KELOMPOK.replace(" ", "")}` as keyof ProcessedData;
                    const familyKey = item["NAMA KELUARGA"];

                    // Increment the total people count for the group
                    if (result[groupKey] !== undefined) {
                        result[groupKey]++;
                    }

                    // Initialize family count for the group if not already
                    if (!familyCounts[item.KELOMPOK]) {
                        familyCounts[item.KELOMPOK] = {};
                    }
                    // Count unique families within the group
                    if (!familyCounts[item.KELOMPOK][familyKey]) {
                        familyCounts[item.KELOMPOK][familyKey] = true;
                        if (result[familyGroupKey] !== undefined) {
                            result[familyGroupKey]++;
                        }
                    }
                });
                setCountDuafa(result)
            })
            .catch((error: any) => {
                return error
            });
    };

    const downloadDataSensus = async () => {
        const params = "DATA JAMAAH DESA"
        await fetch(`https://sheetdb.io/api/v1/uijf2hx2kvi0k?sheet=${params}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                const initialCategories = {
                    balita_l: [],
                    balita_p: [],
                    paud_l: [],
                    paud_p: [],
                    caberawit_l: [],
                    caberawit_p: [],
                    praremaja_l: [],
                    praremaja_p: [],
                    remaja_l: [],
                    remaja_p: [],
                    pranikah_l: [],
                    pranikah_p: [],
                    menikah_l: [],
                    menikah_p: [],
                    janda: [],
                    duda: []
                };

                const createGroupedData = () => ({
                    kelompok1: JSON.parse(JSON.stringify(initialCategories)),
                    kelompok2: JSON.parse(JSON.stringify(initialCategories)),
                    kelompok3: JSON.parse(JSON.stringify(initialCategories)),
                    kelompok4: JSON.parse(JSON.stringify(initialCategories)),
                    kelompok5: JSON.parse(JSON.stringify(initialCategories))
                });

                const groupedData = createGroupedData();

                let filteredData = data.filter((item: any) => {
                    return (
                        (item["STATUS PONDOK"] !== "Luar Daerah" && item["STATUS AKTIF"] !== "Tidak Aktif")
                    );
                });

                filteredData.forEach((person: { KELOMPOK: string, JENJANG: string, "JENIS KELAMIN": string, "STATUS PERNIKAHAN": string }) => {
                    const { KELOMPOK, JENJANG, "JENIS KELAMIN": JENIS_KELAMIN, "STATUS PERNIKAHAN": STATUS_PERNIKAHAN } = person;

                    if (KELOMPOK && KELOMPOK.startsWith("Kelompok ")) {
                        const groupNumber = parseInt(KELOMPOK.split(" ")[1]);
                        if (groupNumber >= 1 && groupNumber <= 5) {
                            const groupKey = `kelompok${groupNumber}` as keyof typeof groupedData;
                            const categories = groupedData[groupKey];

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

                            if (STATUS_PERNIKAHAN === "Janda") {
                                categories.janda.push(person);
                            } else if (STATUS_PERNIKAHAN === "Duda") {
                                categories.duda.push(person);
                            }
                        }
                    }
                });
                const totalBalita_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].balita_l.length, 0);
                const totalBalita_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].balita_p.length, 0);
                const totalPaud_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].paud_l.length, 0);
                const totalPaud_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].paud_p.length, 0);
                const totalCaberawit_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].caberawit_l.length, 0);
                const totalCaberawit_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].caberawit_p.length, 0);
                const totalPraremaja_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].praremaja_l.length, 0);
                const totalPraremaja_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].praremaja_p.length, 0);
                const totalRemaja_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].remaja_l.length, 0);
                const totalRemaja_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].remaja_p.length, 0);
                const totalPraNikah_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].pranikah_l.length, 0);
                const totalPraNikah_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].pranikah_p.length, 0);
                const totalMenikah_lDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].menikah_l.length, 0);
                const totalMenikah_pDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].menikah_p.length, 0);
                const totalDudaDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].duda.length, 0);
                const totalJandaDesa = (['kelompok1', 'kelompok2', 'kelompok3', 'kelompok4', 'kelompok5'] as const)
                    .reduce((sum, group) => sum + groupedData[group].janda.length, 0);


                setCountJenjang({
                    ...groupedData,
                    // KELOMPOK 1
                    totalLakiKelompok1: groupedData.kelompok1.balita_l.length + groupedData.kelompok1.paud_l.length + groupedData.kelompok1.caberawit_l.length + groupedData.kelompok1.praremaja_l.length + groupedData.kelompok1.remaja_l.length + groupedData.kelompok1.pranikah_l.length + groupedData.kelompok1.menikah_l.length + groupedData.kelompok1.duda.length,
                    totalPerempuanKelompok1: groupedData.kelompok1.balita_p.length + groupedData.kelompok1.paud_p.length + groupedData.kelompok1.caberawit_p.length + groupedData.kelompok1.praremaja_p.length + groupedData.kelompok1.remaja_p.length + groupedData.kelompok1.pranikah_p.length + groupedData.kelompok1.menikah_p.length + groupedData.kelompok1.janda.length,
                    totalKeseluruhanKelompok1: groupedData.kelompok1.balita_l.length + groupedData.kelompok1.paud_l.length + groupedData.kelompok1.caberawit_l.length + groupedData.kelompok1.praremaja_l.length + groupedData.kelompok1.remaja_l.length + groupedData.kelompok1.pranikah_l.length + groupedData.kelompok1.menikah_l.length + groupedData.kelompok1.duda.length + groupedData.kelompok1.balita_p.length + groupedData.kelompok1.paud_p.length + groupedData.kelompok1.caberawit_p.length + groupedData.kelompok1.praremaja_p.length + groupedData.kelompok1.remaja_p.length + groupedData.kelompok1.pranikah_p.length + groupedData.kelompok1.menikah_p.length + groupedData.kelompok1.janda.length,
                    totalBalitaLKelompok1: groupedData.kelompok1.balita_l.length,
                    totalBalitaPKelompok1: groupedData.kelompok1.balita_p.length,
                    totalPaudLKelompok1: groupedData.kelompok1.paud_l.length,
                    totalPaudPKelompok1: groupedData.kelompok1.paud_p.length,
                    totalCabeRawitLKelompok1: groupedData.kelompok1.caberawit_l.length,
                    totalCabeRawitPKelompok1: groupedData.kelompok1.caberawit_p.length,
                    totalPraRemajaLKelompok1: groupedData.kelompok1.praremaja_l.length,
                    totalPraRemajaPKelompok1: groupedData.kelompok1.praremaja_p.length,
                    totalRemajaLKelompok1: groupedData.kelompok1.remaja_l.length,
                    totalRemajaPKelompok1: groupedData.kelompok1.remaja_p.length,
                    totalPraNikahLKelompok1: groupedData.kelompok1.pranikah_l.length,
                    totalPraNikahPKelompok1: groupedData.kelompok1.pranikah_p.length,
                    totalMenikahLKelompok1: groupedData.kelompok1.menikah_l.length,
                    totalMenikahPKelompok1: groupedData.kelompok1.menikah_p.length,
                    totalDudaKelompok1: groupedData.kelompok1.duda.length,
                    totalJandaKelompok1: groupedData.kelompok1.janda.length,

                    // KELOMPOK 2
                    totalLakiKelompok2: groupedData.kelompok2.balita_l.length + groupedData.kelompok2.paud_l.length + groupedData.kelompok2.caberawit_l.length + groupedData.kelompok2.praremaja_l.length + groupedData.kelompok2.remaja_l.length + groupedData.kelompok2.pranikah_l.length + groupedData.kelompok2.menikah_l.length + groupedData.kelompok2.duda.length,
                    totalPerempuanKelompok2: groupedData.kelompok2.balita_p.length + groupedData.kelompok2.paud_p.length + groupedData.kelompok2.caberawit_p.length + groupedData.kelompok2.praremaja_p.length + groupedData.kelompok2.remaja_p.length + groupedData.kelompok2.pranikah_p.length + groupedData.kelompok2.menikah_p.length + groupedData.kelompok2.janda.length,
                    totalKeseluruhanKelompok2: groupedData.kelompok2.balita_l.length + groupedData.kelompok2.paud_l.length + groupedData.kelompok2.caberawit_l.length + groupedData.kelompok2.praremaja_l.length + groupedData.kelompok2.remaja_l.length + groupedData.kelompok2.pranikah_l.length + groupedData.kelompok2.menikah_l.length + groupedData.kelompok2.duda.length + groupedData.kelompok2.balita_p.length + groupedData.kelompok2.paud_p.length + groupedData.kelompok2.caberawit_p.length + groupedData.kelompok2.praremaja_p.length + groupedData.kelompok2.remaja_p.length + groupedData.kelompok2.pranikah_p.length + groupedData.kelompok2.menikah_p.length + groupedData.kelompok2.janda.length,
                    totalBalitaLKelompok2: groupedData.kelompok2.balita_l.length,
                    totalBalitaPKelompok2: groupedData.kelompok2.balita_p.length,
                    totalPaudLKelompok2: groupedData.kelompok2.paud_l.length,
                    totalPaudPKelompok2: groupedData.kelompok2.paud_p.length,
                    totalCabeRawitLKelompok2: groupedData.kelompok2.caberawit_l.length,
                    totalCabeRawitPKelompok2: groupedData.kelompok2.caberawit_p.length,
                    totalPraRemajaLKelompok2: groupedData.kelompok2.praremaja_l.length,
                    totalPraRemajaPKelompok2: groupedData.kelompok2.praremaja_p.length,
                    totalRemajaLKelompok2: groupedData.kelompok2.remaja_l.length,
                    totalRemajaPKelompok2: groupedData.kelompok2.remaja_p.length,
                    totalPraNikahLKelompok2: groupedData.kelompok2.pranikah_l.length,
                    totalPraNikahPKelompok2: groupedData.kelompok2.pranikah_p.length,
                    totalMenikahLKelompok2: groupedData.kelompok2.menikah_l.length,
                    totalMenikahPKelompok2: groupedData.kelompok2.menikah_p.length,
                    totalDudaKelompok2: groupedData.kelompok2.duda.length,
                    totalJandaKelompok2: groupedData.kelompok2.janda.length,

                    // KELOMPOK 3
                    totalLakiKelompok3: groupedData.kelompok3.balita_l.length + groupedData.kelompok3.paud_l.length + groupedData.kelompok3.caberawit_l.length + groupedData.kelompok3.praremaja_l.length + groupedData.kelompok3.remaja_l.length + groupedData.kelompok3.pranikah_l.length + groupedData.kelompok3.menikah_l.length + groupedData.kelompok3.duda.length,
                    totalPerempuanKelompok3: groupedData.kelompok3.balita_p.length + groupedData.kelompok3.paud_p.length + groupedData.kelompok3.caberawit_p.length + groupedData.kelompok3.praremaja_p.length + groupedData.kelompok3.remaja_p.length + groupedData.kelompok3.pranikah_p.length + groupedData.kelompok3.menikah_p.length + groupedData.kelompok3.janda.length,
                    totalKeseluruhanKelompok3: groupedData.kelompok3.balita_l.length + groupedData.kelompok3.paud_l.length + groupedData.kelompok3.caberawit_l.length + groupedData.kelompok3.praremaja_l.length + groupedData.kelompok3.remaja_l.length + groupedData.kelompok3.pranikah_l.length + groupedData.kelompok3.menikah_l.length + groupedData.kelompok3.duda.length + groupedData.kelompok3.balita_p.length + groupedData.kelompok3.paud_p.length + groupedData.kelompok3.caberawit_p.length + groupedData.kelompok3.praremaja_p.length + groupedData.kelompok3.remaja_p.length + groupedData.kelompok3.pranikah_p.length + groupedData.kelompok3.menikah_p.length + groupedData.kelompok3.janda.length,
                    totalBalitaLKelompok3: groupedData.kelompok3.balita_l.length,
                    totalBalitaPKelompok3: groupedData.kelompok3.balita_p.length,
                    totalPaudLKelompok3: groupedData.kelompok3.paud_l.length,
                    totalPaudPKelompok3: groupedData.kelompok3.paud_p.length,
                    totalCabeRawitLKelompok3: groupedData.kelompok3.caberawit_l.length,
                    totalCabeRawitPKelompok3: groupedData.kelompok3.caberawit_p.length,
                    totalPraRemajaLKelompok3: groupedData.kelompok3.praremaja_l.length,
                    totalPraRemajaPKelompok3: groupedData.kelompok3.praremaja_p.length,
                    totalRemajaLKelompok3: groupedData.kelompok3.remaja_l.length,
                    totalRemajaPKelompok3: groupedData.kelompok3.remaja_p.length,
                    totalPraNikahLKelompok3: groupedData.kelompok3.pranikah_l.length,
                    totalPraNikahPKelompok3: groupedData.kelompok3.pranikah_p.length,
                    totalMenikahLKelompok3: groupedData.kelompok3.menikah_l.length,
                    totalMenikahPKelompok3: groupedData.kelompok3.menikah_p.length,
                    totalDudaKelompok3: groupedData.kelompok3.duda.length,
                    totalJandaKelompok3: groupedData.kelompok3.janda.length,

                    // KELOMPOK 4
                    totalLakiKelompok4: groupedData.kelompok4.balita_l.length + groupedData.kelompok4.paud_l.length + groupedData.kelompok4.caberawit_l.length + groupedData.kelompok4.praremaja_l.length + groupedData.kelompok4.remaja_l.length + groupedData.kelompok4.pranikah_l.length + groupedData.kelompok4.menikah_l.length + groupedData.kelompok4.duda.length,
                    totalPerempuanKelompok4: groupedData.kelompok4.balita_p.length + groupedData.kelompok4.paud_p.length + groupedData.kelompok4.caberawit_p.length + groupedData.kelompok4.praremaja_p.length + groupedData.kelompok4.remaja_p.length + groupedData.kelompok4.pranikah_p.length + groupedData.kelompok4.menikah_p.length + groupedData.kelompok4.janda.length,
                    totalKeseluruhanKelompok4: groupedData.kelompok4.balita_l.length + groupedData.kelompok4.paud_l.length + groupedData.kelompok4.caberawit_l.length + groupedData.kelompok4.praremaja_l.length + groupedData.kelompok4.remaja_l.length + groupedData.kelompok4.pranikah_l.length + groupedData.kelompok4.menikah_l.length + groupedData.kelompok4.duda.length + groupedData.kelompok4.balita_p.length + groupedData.kelompok4.paud_p.length + groupedData.kelompok4.caberawit_p.length + groupedData.kelompok4.praremaja_p.length + groupedData.kelompok4.remaja_p.length + groupedData.kelompok4.pranikah_p.length + groupedData.kelompok4.menikah_p.length + groupedData.kelompok4.janda.length,
                    totalBalitaLKelompok4: groupedData.kelompok4.balita_l.length,
                    totalBalitaPKelompok4: groupedData.kelompok4.balita_p.length,
                    totalPaudLKelompok4: groupedData.kelompok4.paud_l.length,
                    totalPaudPKelompok4: groupedData.kelompok4.paud_p.length,
                    totalCabeRawitLKelompok4: groupedData.kelompok4.caberawit_l.length,
                    totalCabeRawitPKelompok4: groupedData.kelompok4.caberawit_p.length,
                    totalPraRemajaLKelompok4: groupedData.kelompok4.praremaja_l.length,
                    totalPraRemajaPKelompok4: groupedData.kelompok4.praremaja_p.length,
                    totalRemajaLKelompok4: groupedData.kelompok4.remaja_l.length,
                    totalRemajaPKelompok4: groupedData.kelompok4.remaja_p.length,
                    totalPraNikahLKelompok4: groupedData.kelompok4.pranikah_l.length,
                    totalPraNikahPKelompok4: groupedData.kelompok4.pranikah_p.length,
                    totalMenikahLKelompok4: groupedData.kelompok4.menikah_l.length,
                    totalMenikahPKelompok4: groupedData.kelompok4.menikah_p.length,
                    totalDudaKelompok4: groupedData.kelompok4.duda.length,
                    totalJandaKelompok4: groupedData.kelompok4.janda.length,

                    // KELOMPOK 5
                    totalLakiKelompok5: groupedData.kelompok5.balita_l.length + groupedData.kelompok5.paud_l.length + groupedData.kelompok5.caberawit_l.length + groupedData.kelompok5.praremaja_l.length + groupedData.kelompok5.remaja_l.length + groupedData.kelompok5.pranikah_l.length + groupedData.kelompok5.menikah_l.length + groupedData.kelompok5.duda.length,
                    totalPerempuanKelompok5: groupedData.kelompok5.balita_p.length + groupedData.kelompok5.paud_p.length + groupedData.kelompok5.caberawit_p.length + groupedData.kelompok5.praremaja_p.length + groupedData.kelompok5.remaja_p.length + groupedData.kelompok5.pranikah_p.length + groupedData.kelompok5.menikah_p.length + groupedData.kelompok5.janda.length,
                    totalKeseluruhanKelompok5: groupedData.kelompok5.balita_l.length + groupedData.kelompok5.paud_l.length + groupedData.kelompok5.caberawit_l.length + groupedData.kelompok5.praremaja_l.length + groupedData.kelompok5.remaja_l.length + groupedData.kelompok5.pranikah_l.length + groupedData.kelompok5.menikah_l.length + groupedData.kelompok5.duda.length + groupedData.kelompok5.balita_p.length + groupedData.kelompok5.paud_p.length + groupedData.kelompok5.caberawit_p.length + groupedData.kelompok5.praremaja_p.length + groupedData.kelompok5.remaja_p.length + groupedData.kelompok5.pranikah_p.length + groupedData.kelompok5.menikah_p.length + groupedData.kelompok5.janda.length,
                    totalBalitaLKelompok5: groupedData.kelompok5.balita_l.length,
                    totalBalitaPKelompok5: groupedData.kelompok5.balita_p.length,
                    totalPaudLKelompok5: groupedData.kelompok5.paud_l.length,
                    totalPaudPKelompok5: groupedData.kelompok5.paud_p.length,
                    totalCabeRawitLKelompok5: groupedData.kelompok5.caberawit_l.length,
                    totalCabeRawitPKelompok5: groupedData.kelompok5.caberawit_p.length,
                    totalPraRemajaLKelompok5: groupedData.kelompok5.praremaja_l.length,
                    totalPraRemajaPKelompok5: groupedData.kelompok5.praremaja_p.length,
                    totalRemajaLKelompok5: groupedData.kelompok5.remaja_l.length,
                    totalRemajaPKelompok5: groupedData.kelompok5.remaja_p.length,
                    totalPraNikahLKelompok5: groupedData.kelompok5.pranikah_l.length,
                    totalPraNikahPKelompok5: groupedData.kelompok5.pranikah_p.length,
                    totalMenikahLKelompok5: groupedData.kelompok5.menikah_l.length,
                    totalMenikahPKelompok5: groupedData.kelompok5.menikah_p.length,
                    totalDudaKelompok5: groupedData.kelompok5.duda.length,
                    totalJandaKelompok5: groupedData.kelompok5.janda.length,

                    // DESA
                    totalBalita_lDesa,
                    totalBalita_pDesa,
                    totalPaud_lDesa,
                    totalPaud_pDesa,
                    totalCaberawit_lDesa,
                    totalCaberawit_pDesa,
                    totalPraremaja_lDesa,
                    totalPraremaja_pDesa,
                    totalRemaja_lDesa,
                    totalRemaja_pDesa,
                    totalPraNikah_lDesa,
                    totalPraNikah_pDesa,
                    totalMenikah_lDesa,
                    totalMenikah_pDesa,
                    totalDudaDesa,
                    totalJandaDesa
                });
            })
            .catch((error: any) => {
                return error
            });
    };

    return (
        <div>
            {isSuccess ?
                <>
                    <TableSensus
                        jumlahJenjang={countJenjang}
                        jumlahKK={countKK}
                        jumlahDuafa={countDuafa}
                        jumlahBinaan={countBinaan}
                        loading={isSuccess}
                    />
                </> :
                <div style={{ height: window.innerHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button className="btn-connect" type="button" onClick={() => handleDownload()}>
                        <strong>CONNECT TO SERVER</strong>
                        <div id="container-stars">
                            <div id="stars"></div>
                        </div>
                        <div id="glow">
                            <div className="circle"></div>
                            <div className="circle"></div>
                        </div>
                    </button>
                </div>
            }

            {loading ? <div className="loading-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="loader">
                    <div data-glitch="Loading..." className="glitch">Loading...</div>
                </div>
            </div> : null}

        </div>

    );
};

export default TotalSensus;
