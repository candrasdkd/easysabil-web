// OrderListPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

// MUI
import {
    Box,
    Stack,
    Typography,
    TextField,
    IconButton,
    Button,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Paper,
    Divider,
    CardActions,
    Grid,
    Drawer,
    Tooltip,
    Checkbox,
    Pagination,
    Chip,
    Card,
    CardContent,
    Avatar,
    LinearProgress,
    Alert,
    useTheme,
    useMediaQuery,
} from "@mui/material";

import {
    FilterList,
    Add,
    Person,
    Category as CategoryIcon,
    ShoppingBag,
    CheckCircle,
    Payment,
    Edit,
    Delete,
    Close,
    Receipt,
    TrendingUp,
    Paid,
    Pending,
    Share,
} from "@mui/icons-material";
import { supabase } from "../supabase/client";
import { useLocation } from "react-router";

// =====================
// Type Definitions
// =====================
export type SelectedCategoryProps = {
    label: string;
    value: string;
    id: string;
    name: string;
    price: string;
    year?: string | number;
};

export type DataDropdown = {
    label: string;
    value: string;
    id: string | number;
    name?: string;
    price?: number | string;
    year?: number | string;
};

export type DataOrder = {
    id: number;
    user_name: string;
    user_id: string;
    id_category_order: number;
    name_category: string;
    total_order: number;
    unit_price: number;
    note?: string | null;
    is_payment: boolean;
    actual_price: number;
    created_at?: string;
};

type Props = {
    selectedCategory?: SelectedCategoryProps;
};

// =====================
// Helpers
// =====================
function formatRupiah(n: string | number): string {
    const num =
        typeof n === "string"
            ? parseInt(n.replace(/[^0-9-]/g, ""), 10) || 0
            : Number(n) || 0;
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(num);
}

// =====================
// Component
// =====================
const OrderListPage: React.FC<Props> = ({ selectedCategory }) => {
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const routeState = location.state as
        | { selectedCategory?: SelectedCategoryProps }
        | undefined;

    const selectedFromRoute = routeState?.selectedCategory;
    const [dataOrder, setDataOrder] = useState<DataOrder[]>([]);
    const [dataDropdownSensus, setDataDropdownSensus] = useState<DataDropdown[]>(
        []
    );
    const [dataDropdownCategory, setDataDropdownCategory] = useState<
        DataDropdown[]
    >([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const [searchQuery, setSearchQuery] = useState("");
    const [modalPayment, setModalPayment] = useState(false);
    const [modalCreate, setModalCreate] = useState(false);
    const [modalFilter, setModalFilter] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showAllData, setShowAllData] = useState(false);
    const [modalUpdate, setModalUpdate] = useState(false);
    const [userLevel, setUserLevel] = useState<number | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const [settingFilter, setSettingFilter] = useState<{
        category: SelectedCategoryProps;
        isPayment: boolean | null;
    }>({
        category:
            selectedCategory || {
                label: "",
                value: "",
                id: "",
                name: "",
                price: "",
            },
        isPayment: null,
    });

    const [dataUpload, setDataUpload] = useState<{
        idCard: number | null;
        user: { label: string; value: string; id: string };
        category: SelectedCategoryProps;
        totalOrder: string;
        note: string;
    }>({
        idCard: null,
        user: { label: "", value: "", id: "" },
        category:
            selectedCategory || { label: "", value: "", id: "", name: "", price: "" },
        totalOrder: "",
        note: "",
    });

    const [actualPrice, setActualPrice] = useState("");
    const [isExactChange, setIsExactChange] = useState(false);
    const [detailData, setDetailData] = useState<{
        id: number;
        price: string;
        status: boolean;
    }>({
        id: 0,
        price: "",
        status: false,
    });

    // Derived totals
    const grandTotal = useMemo(
        () =>
            dataOrder.reduce((total, item) => total + item.unit_price * item.total_order, 0),
        [dataOrder]
    );

    const grandTotalActual = useMemo(
        () => dataOrder.reduce((total, item) => total + (item.actual_price || 0), 0),
        [dataOrder]
    );
    const calculateTotalItems = (data: DataOrder[]) =>
        (data || []).reduce((total, order) => total + (order.total_order || 0), 0);

    const totalPrice = (price: number, total: number) => String(price * total);

    // Filters & pagination
    const filteredOrder = useMemo(() => {
        return dataOrder.filter((item) => {
            const matchesSearch =
                searchQuery === "" ||
                item.user_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPayment =
                settingFilter.isPayment === null ||
                item.is_payment === settingFilter.isPayment;
            return matchesSearch && matchesPayment;
        });
    }, [dataOrder, searchQuery, settingFilter.isPayment]);

    // Statistics
    const stats = useMemo(() => {
        const totalItems = calculateTotalItems(filteredOrder);
        const paidOrders = filteredOrder.filter(item => item.is_payment).length;
        const unpaidOrders = filteredOrder.length - paidOrders;
        const paymentRate = filteredOrder.length > 0 ? (paidOrders / filteredOrder.length) * 100 : 0;

        return {
            totalItems,
            paidOrders,
            unpaidOrders,
            paymentRate,
            totalValue: grandTotal,
            totalReceived: grandTotalActual,
        };
    }, [filteredOrder, grandTotal, grandTotalActual]);

    // Fetchers
    const fetchDataOrder = useCallback(async () => {
        setError(null);
        try {
            let query = supabase.from("list_order").select("*").order("created_at", {
                ascending: false,
            });

            if (settingFilter.category.id && !showAllData) {
                query = query.eq("id_category_order", settingFilter.category.id);
            }

            const { data, error } = await query;
            if (error) {
                setError(error.message);
                return;
            }
            setDataOrder((data as DataOrder[]) || []);
        } catch (e) {
            setError("Failed to fetch data");
            console.error(e);
        }
    }, [settingFilter.category.id, showAllData]);

    const fetchSensus = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("list_sensus")
                .select("uuid,name")
                .order("name", { ascending: true });
            if (error) {
                setError(error.message);
                return;
            }
            const transformed: DataDropdown[] =
                (data || []).map((item: any) => ({
                    label: item.name,
                    value: item.name,
                    id: item.uuid,
                })) ?? [];
            setDataDropdownSensus(transformed);
        } catch (e) {
            setError("Failed to fetch data");
            console.error(e);
        }
    }, []);

    const fetchListOrder = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("category_order")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) {
                setError(error.message);
                return;
            }
            const transformed: DataDropdown[] =
                (data || []).map((item: any) => ({
                    ...item,
                    label: `${item.name} ${item.year}`,
                    value: `${item.name} ${item.year}`,
                    id: item.id,
                })) ?? [];
            setDataDropdownCategory(transformed);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    // CRUD handlers
    const handleUpdateOrder = async () => {
        try {
            setUploading(true);

            if (!isExactChange && (!actualPrice || actualPrice.trim() === "")) {
                alert("Masukkan uang yang diterima");
                return;
            }

            const numericPrice = isExactChange
                ? parseInt(detailData.price.replace(/[^0-9]/g, ""), 10) || 0
                : parseInt(actualPrice.replace(/[^0-9]/g, ""), 10) || 0;

            const transformBody = {
                actual_price: numericPrice,
                is_payment: !detailData.status,
            };

            const { error, status } = await supabase
                .from("list_order")
                .update(transformBody)
                .eq("id", detailData.id)
                .select();

            if (status === 200) {
                alert("Berhasil: Data berhasil diupdate");
                await fetchDataOrder();
                handleResetPayment();
            } else {
                alert(`Error: ${error?.message || "Gagal menyimpan data"}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleCreateOrUpdateOrder = async () => {
        try {
            if (
                !dataUpload?.user?.value ||
                !dataUpload?.user?.id ||
                !dataUpload?.category?.id ||
                !dataUpload?.category?.name ||
                !dataUpload?.totalOrder
            ) {
                alert("Info: Semua field harus diisi");
                return;
            }

            const transformBody = {
                user_name: dataUpload.user.value,
                user_id: dataUpload.user.id,
                id_category_order: parseInt(String(dataUpload.category.id), 10),
                name_category: dataUpload.category.label,
                total_order: parseInt(dataUpload.totalOrder, 10),
                unit_price: parseInt(String(dataUpload.category.price), 10),
                note: dataUpload.note,
            };

            setUploading(true);

            if (modalUpdate && dataUpload.idCard) {
                const { error, status } = await supabase
                    .from("list_order")
                    .update(transformBody)
                    .eq("id", dataUpload.idCard)
                    .select();

                if (status === 200) {
                    alert("Berhasil: Data berhasil diupdate");
                    await fetchDataOrder();
                } else {
                    alert(`Error: ${error?.message || "Gagal menyimpan data"}`);
                }
            } else {
                const { error, status } = await supabase
                    .from("list_order")
                    .insert([transformBody])
                    .select();

                if (status === 201) {
                    alert("Berhasil: Data berhasil dibuat");
                    await fetchDataOrder();
                } else {
                    alert(`Error: ${error?.message || "Gagal menyimpan data"}`);
                }
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setUploading(false);
            handleResetUpload();
        }
    };

    const handleDeleteUser = async (id: number) => {
        const ok = confirm("Apakah Anda yakin ingin menghapus data ini?");
        if (!ok) return;

        const { error, status } = await supabase
            .from("list_order")
            .delete()
            .eq("id", id);
        if (error) {
            setError(error.message);
            return;
        }
        if (status === 204) {
            await fetchDataOrder();
            alert("Berhasil: Data berhasil dihapus");
        }
    };

    // Misc handlers
    const handleResetPayment = () => {
        setDetailData({ id: 0, price: "", status: false });
        setActualPrice("");
        setIsExactChange(false);
        setModalPayment(false);
    };

    const handleResetUpload = () => {
        setDataUpload({
            idCard: null,
            user: { label: "", value: "", id: "" },
            category: { label: "", value: "", id: "", name: "", price: "" },
            totalOrder: "",
            note: "",
        });
        setIsExactChange(false);
        setModalUpdate(false);
        setModalCreate(false);
    };

    const handleCopyToClipboard = async () => {
        let total = 0;
        const list = filteredOrder
            .map((item, idx) => {
                const t = item.unit_price * item.total_order;
                total += t;
                return `${idx + 1}. ${item.user_name} (${item.total_order}/pcs)`;
            })
            .join("\n");

        const filterStatus =
            settingFilter.isPayment === null
                ? ""
                : `\n${settingFilter.isPayment ? "✅ Status : *LUNAS*" : "❌ Status : *BELUM LUNAS*"}`;

        const finalText = `📋 *DAFTAR PESANAN* 📋
*${(settingFilter.category.label || "").toUpperCase()}*

📌 *RINGKASAN*
📦 Total Pesanan : *${calculateTotalItems(filteredOrder)} pcs*
💰 Total Harga : *${formatRupiah(total)}*${filterStatus}

====================

${list}`;

        try {
            await navigator.clipboard.writeText(finalText);
            alert("Info: Data berhasil disalin ke clipboard");
        } catch {
            const ta = document.createElement("textarea");
            ta.value = finalText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            alert("Info: Data berhasil disalin ke clipboard");
        }

        try {
            if ((navigator as any).share) {
                await (navigator as any).share({
                    title: "Daftar Pesanan",
                    text: finalText,
                });
            } else {
                const url = `https://wa.me/?text=${encodeURIComponent(finalText)}`;
                window.open(url, "_blank");
            }
        } catch {
            // ignore cancel
        }
    };

    const totalPages = Math.max(1, Math.ceil(filteredOrder.length / itemsPerPage));
    const from = page * itemsPerPage;
    const to = Math.min((page + 1) * itemsPerPage, filteredOrder.length);

    // Effects
    useEffect(() => {
        fetchListOrder();
        fetchSensus();
        try {
            const raw = localStorage.getItem("userData");
            if (raw) {
                const parsed = JSON.parse(raw);
                setUserLevel(typeof parsed?.level === "number" ? parsed.level : null);
            }
        } catch {
            // ignore
        }
    }, [fetchListOrder, fetchSensus]);

    useEffect(() => {
        if (settingFilter.category.id || showAllData) {
            fetchDataOrder();
        }
    }, [fetchDataOrder, settingFilter.category.id, showAllData]);

    useEffect(() => {
        if (selectedFromRoute) {
            setSettingFilter((prev) => ({ ...prev, category: selectedFromRoute }));
        }
    }, [selectedFromRoute]);

    useEffect(() => {
        if (selectedCategory && !selectedFromRoute) {
            setSettingFilter((prev) => ({ ...prev, category: selectedCategory }));
        }
    }, [selectedCategory, selectedFromRoute]);

    // Enhanced UI renderers
    const renderOrderItem = (item: DataOrder) => {
        const calculatedTotalPrice = item.unit_price * item.total_order;
        const isPaid = !!item.is_payment;

        return (
            <Card
                key={item.id}
                elevation={1}
                sx={{
                    mb: 2,
                    borderLeft: 4,
                    borderLeftColor: isPaid ? "success.main" : "warning.main",
                    transition: "all 0.2s ease-in-out",
                    '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                    },
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                        spacing={1}
                    >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Avatar sx={{
                                width: { xs: 32, sm: 40 },
                                height: { xs: 32, sm: 40 },
                                bgcolor: isPaid ? 'success.main' : 'warning.main'
                            }}>
                                <Person />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" fontWeight={600} fontSize={{ xs: "1rem", sm: "1.25rem" }}>
                                    {item.user_name}
                                </Typography>
                                <Chip
                                    label={isPaid ? "LUNAS" : "BELUM BAYAR"}
                                    size="small"
                                    color={isPaid ? "success" : "warning"}
                                    variant={isPaid ? "filled" : "outlined"}
                                />
                            </Box>
                        </Stack>
                    </Stack>

                    {/* Order Details */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <CategoryIcon fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Kategori
                                    </Typography>
                                </Stack>
                                <Typography variant="body1" fontWeight={500}>
                                    {item.name_category}
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ShoppingBag fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Jumlah
                                    </Typography>
                                </Stack>
                                <Typography variant="body1" fontWeight={500}>
                                    {item.total_order} pcs
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>

                    {/* Price Details */}
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Harga Satuan
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {formatRupiah(item.unit_price)}
                                </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Uang Diterima
                                </Typography>
                                <Typography
                                    variant="body2"
                                    fontWeight={500}
                                    color={isPaid ? "success.main" : "text.secondary"}
                                >
                                    {formatRupiah(item.actual_price || 0)}
                                </Typography>
                            </Stack>
                            <Divider />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1" fontWeight={600}>
                                    Total
                                </Typography>
                                <Typography variant="h6" fontWeight={700} color="success.main" fontSize={{ xs: "1rem", sm: "1.25rem" }}>
                                    {formatRupiah(calculatedTotalPrice)}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    {item.note && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>Catatan:</strong> {item.note}
                            </Typography>
                        </Alert>
                    )}

                    {/* Actions */}
                    <CardActions sx={{ p: 0, justifyContent: "space-between", flexDirection: { xs: "column", sm: "row" }, gap: 1 }}>
                        <Button
                            variant={isPaid ? "outlined" : "contained"}
                            color={isPaid ? "success" : "warning"}
                            startIcon={isPaid ? <CheckCircle /> : <Payment />}
                            onClick={() => {
                                if (isPaid) {
                                    alert("Info: Pembayaran sudah lunas");
                                } else {
                                    setDetailData({
                                        id: item.id,
                                        price: totalPrice(item.unit_price, item.total_order),
                                        status: item.is_payment,
                                    });
                                    setActualPrice("");
                                    setIsExactChange(false);
                                    setModalPayment(true);
                                }
                            }}
                            size="small"
                            fullWidth={isMobile}
                        >
                            {isPaid ? "Lunas" : "Bayar"}
                        </Button>

                        {userLevel === 0 && (
                            <Stack direction="row" spacing={0.5} width={{ xs: "100%", sm: "auto" }} justifyContent={{ xs: "space-between", sm: "flex-end" }}>
                                <Tooltip title="Edit">
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        onClick={() => {
                                            setDataUpload({
                                                idCard: item.id,
                                                user: {
                                                    label: item.user_name,
                                                    value: item.user_name,
                                                    id: String(item.user_id),
                                                },
                                                category: {
                                                    label: item.name_category,
                                                    value: item.name_category,
                                                    id: String(item.id_category_order),
                                                    name: item.name_category,
                                                    price: String(item.unit_price),
                                                },
                                                totalOrder: String(item.total_order),
                                                note: item.note || "",
                                            });
                                            setModalUpdate(true);
                                            setModalCreate(true);
                                        }}
                                    >
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                    <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteUser(item.id)}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        )}
                    </CardActions>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", pb: 8 }}>
            {/* Top Bar dengan Stats */}
            {(settingFilter.category.id || showAllData) ? (
                <>
                    {/* Header Section */}
                    <Paper
                        elevation={0}
                        sx={{
                            color: 'black',
                            p: { xs: 2, sm: 3 },
                            borderRadius: 0,
                            mb: 3
                        }}
                    >
                        <Stack spacing={2}>
                            <Stack direction={{ xs: "row", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
                                <Typography variant="h4" fontWeight={700} fontSize={{ xs: "1.5rem", sm: "2rem" }}>
                                    Daftar Pesanan
                                </Typography>
                                <Chip
                                    label={settingFilter.category.label || "Semua Kategori"}
                                    color="secondary"
                                    variant="filled"
                                    sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
                                />
                            </Stack>

                        </Stack>
                    </Paper>

                    {/* Search and Actions */}
                    <Box sx={{ px: { xs: 2, sm: 3 }, mb: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                                <TextField
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setPage(0);
                                        setSearchQuery(e.target.value);
                                    }}
                                    placeholder="Cari nama pemesan..."
                                    size="medium"
                                    fullWidth
                                    variant="outlined"
                                />
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} width={{ xs: "100%", sm: "auto" }}>
                                    <Tooltip title="Filter Data">
                                        <Button
                                            variant="outlined"
                                            startIcon={<FilterList />}
                                            onClick={() => setModalFilter(true)}
                                            fullWidth={isMobile}
                                        >
                                            {isMobile ? "Filter" : "Filter Data"}
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Salin & Bagikan">
                                        <Button
                                            variant="outlined"
                                            startIcon={<Share />}
                                            onClick={handleCopyToClipboard}
                                            fullWidth={isMobile}
                                        >
                                            {isMobile ? "Bagikan" : "Salin & Bagikan"}
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Tambah Pesanan Baru">
                                        <Button
                                            variant="contained"
                                            startIcon={<Add />}
                                            onClick={() => {
                                                setModalUpdate(false);
                                                setModalCreate(true);
                                            }}
                                            sx={{ minWidth: { xs: "auto", sm: 140 } }}
                                            fullWidth={isMobile}
                                        >
                                            {isMobile ? "Tambah" : "Tambah Pesanan"}
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Paper>
                    </Box>

                    {/* Static Summary Button */}
                    <Box sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 1000,
                        display: (settingFilter.category.id || showAllData) && !loading && !error && filteredOrder.length > 0 ? 'block' : 'none'
                    }}>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<TrendingUp />}
                            onClick={() => setSheetOpen(true)}
                            size="large"
                            sx={{
                                borderRadius: 3,
                                boxShadow: 3,
                                minWidth: 'auto',
                                px: 3,
                                py: 1.5,
                                fontSize: { xs: '0.8rem', sm: '0.9rem' }
                            }}
                        >
                            {isMobile ? "Ringkasan" : "Lihat Ringkasan"}
                        </Button>
                    </Box>

                    {/* Content */}
                    <Box sx={{ px: { xs: 2, sm: 3 } }}>
                        {loading ? (
                            <Box sx={{ textAlign: "center", py: 5 }}>
                                <LinearProgress sx={{ mb: 2 }} />
                                <Typography>Memuat data...</Typography>
                            </Box>
                        ) : error ? (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        ) : filteredOrder.length === 0 ? (
                            <Paper sx={{ textAlign: "center", py: 8 }}>
                                <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Tidak ada data pesanan
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Mulai dengan menambahkan pesanan baru'}
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={() => {
                                        setModalUpdate(false);
                                        setModalCreate(true);
                                    }}
                                >
                                    Tambah Pesanan
                                </Button>
                            </Paper>
                        ) : (
                            <>
                                <Box>
                                    {filteredOrder.slice(from, to).map((item) => renderOrderItem(item))}
                                </Box>

                                {/* Pagination */}
                                <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
                                    <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Menampilkan {from + 1}-{to} dari {filteredOrder.length} data
                                            </Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="flex-end">
                                                <FormControl size="small" variant="outlined" fullWidth={isMobile}>
                                                    <InputLabel>Per Halaman</InputLabel>
                                                    <Select
                                                        value={itemsPerPage}
                                                        label="Per Halaman"
                                                        onChange={(e) => {
                                                            const v = Number(e.target.value);
                                                            setItemsPerPage(v);
                                                            setPage(0);
                                                        }}
                                                        sx={{ minWidth: { xs: "100%", sm: 120 } }}
                                                    >
                                                        {[25, 50, 100].map((n) => (
                                                            <MenuItem key={n} value={n}>
                                                                {n} data
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <Pagination
                                                    color="primary"
                                                    count={totalPages}
                                                    page={page + 1}
                                                    onChange={(_, p) => setPage(p - 1)}
                                                    showFirstButton
                                                    showLastButton
                                                    size={isSmallMobile ? "small" : "medium"}
                                                />
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </>
                        )}
                    </Box>
                </>
            ) : (
                // Selector awal kategori
                <Box
                    sx={{
                        minHeight: "80vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 3,
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            width: { xs: "100%", sm: 600 },
                            p: { xs: 3, sm: 4 },
                            textAlign: 'center'
                        }}
                    >
                        <Receipt sx={{ fontSize: { xs: 48, sm: 64 }, color: 'primary.main', mb: 3 }} />
                        <Typography variant="h4" fontWeight={700} gutterBottom fontSize={{ xs: "1.5rem", sm: "2rem" }}>
                            Daftar Pesanan
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            Pilih kategori pesanan yang ingin Anda kelola
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel id="cat-label">Pilih Kategori Pesanan</InputLabel>
                            <Select
                                labelId="cat-label"
                                label="Pilih Kategori Pesanan"
                                value={settingFilter.category?.label || ""}
                                onChange={(e) => {
                                    const sel = dataDropdownCategory.find(
                                        (d) => `${d.name} ${d.year}` === e.target.value
                                    );
                                    if (!sel) return;
                                    setSettingFilter({
                                        ...settingFilter,
                                        category: {
                                            ...sel,
                                            label: `${sel.name} ${sel.year}`,
                                            value: `${sel.name} ${sel.year}`,
                                            price: String(sel.price ?? ""),
                                            id: String(sel.id),
                                            name: sel.name || "",
                                        } as SelectedCategoryProps,
                                    });
                                }}
                                variant="outlined"
                            >
                                <MenuItem value="">-- Pilih Kategori --</MenuItem>
                                {dataDropdownCategory.map((d) => (
                                    <MenuItem key={String(d.id)} value={`${d.name} ${d.year}`}>
                                        {d.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={showAllData}
                                    onChange={(e) => setShowAllData(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Tampilkan semua data dari semua kategori"
                        />
                    </Paper>
                </Box>
            )}
            <Dialog
                open={modalFilter}
                onClose={() => setModalFilter(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    elevation: 8,
                }}
            >
                <DialogTitle sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography variant="h6" fontWeight={600}>
                        <FilterList sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Filter Data
                    </Typography>
                    <IconButton
                        onClick={() => setModalFilter(false)}
                        sx={{ color: 'white' }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* Filter by Category */}
                        <FormControl fullWidth>
                            <InputLabel id="filter-category-label">Kategori Pesanan</InputLabel>
                            <Select
                                labelId="filter-category-label"
                                label="Kategori Pesanan"
                                value={settingFilter.category?.label || ""}
                                onChange={(e) => {
                                    const sel = dataDropdownCategory.find(
                                        (d) => `${d.name} ${d.year}` === e.target.value
                                    );
                                    if (!sel) return;
                                    setSettingFilter(prev => ({
                                        ...prev,
                                        category: {
                                            ...sel,
                                            label: `${sel.name} ${sel.year}`,
                                            value: `${sel.name} ${sel.year}`,
                                            price: String(sel.price ?? ""),
                                            id: String(sel.id),
                                            name: sel.name || "",
                                        } as SelectedCategoryProps,
                                    }));
                                }}
                                variant="outlined"
                            >
                                <MenuItem value="">Semua Kategori</MenuItem>
                                {dataDropdownCategory.map((d) => (
                                    <MenuItem key={String(d.id)} value={`${d.name} ${d.year}`}>
                                        {d.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Filter by Payment Status */}
                        <FormControl fullWidth>
                            <InputLabel id="filter-payment-label">Status Pembayaran</InputLabel>
                            <Select
                                labelId="filter-payment-label"
                                label="Status Pembayaran"
                                value={settingFilter.isPayment === null ? '' : settingFilter.isPayment ? 'paid' : 'unpaid'}
                                onChange={(e) => {
                                    const value = String(e.target.value);
                                    setSettingFilter(prev => ({
                                        ...prev,
                                        isPayment: value === '' ? null : value === 'paid'
                                    }));
                                }}
                                variant="outlined"
                            >
                                <MenuItem value="">Semua Status</MenuItem>
                                <MenuItem value="paid">Sudah Bayar</MenuItem>
                                <MenuItem value="unpaid">Belum Bayar</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Show All Data Toggle */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showAllData}
                                    onChange={(e) => setShowAllData(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Tampilkan semua kategori"
                        />

                        {/* Active Filters Summary */}
                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                bgcolor: 'grey.50',
                                border: 1,
                                borderColor: 'primary.light'
                            }}
                        >
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Filter Aktif:
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {settingFilter.category?.label && (
                                    <Chip
                                        label={`Kategori: ${settingFilter.category.label}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                                {settingFilter.isPayment !== null && (
                                    <Chip
                                        label={`Status: ${settingFilter.isPayment ? 'Sudah Bayar' : 'Belum Bayar'}`}
                                        size="small"
                                        color={settingFilter.isPayment ? "success" : "warning"}
                                        variant="outlined"
                                    />
                                )}
                                {showAllData && (
                                    <Chip
                                        label="Semua Kategori"
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                    />
                                )}
                                {!settingFilter.category?.label && settingFilter.isPayment === null && !showAllData && (
                                    <Typography variant="body2" color="text.secondary">
                                        Tidak ada filter aktif
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>

                        {/* Results Count */}
                        <Alert severity="info" icon={false}>
                            <Typography variant="body2">
                                Menampilkan <strong>{filteredOrder.length}</strong> dari <strong>{dataOrder.length}</strong> total data
                            </Typography>
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setSettingFilter({
                                category: { label: "", value: "", id: "", name: "", price: "" },
                                isPayment: null
                            });
                            setShowAllData(false);
                        }}
                        variant="outlined"
                        color="error"
                        startIcon={<Close />}
                    >
                        Reset Filter
                    </Button>
                    <Button
                        onClick={() => setModalFilter(false)}
                        variant="contained"
                        startIcon={<CheckCircle />}
                    >
                        Terapkan Filter
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced PAYMENT DIALOG */}
            <Dialog
                open={modalPayment}
                onClose={() => !uploading && setModalPayment(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    elevation: 8,
                }}
            >
                <DialogTitle sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography variant="h6" fontWeight={600}>
                        <Paid sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Pembayaran Pesanan
                    </Typography>
                    <IconButton
                        onClick={() => !uploading && setModalPayment(false)}
                        sx={{ color: 'white' }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isExactChange}
                                    onChange={() => setIsExactChange((v) => !v)}
                                    color="primary"
                                />
                            }
                            label="Pembayaran Pas (Tidak Perlu Kembalian)"
                        />

                        <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Total Yang Harus Dibayarkan
                            </Typography>
                            <Typography variant="h4" color="primary.main" fontWeight={700} fontSize={{ xs: "1.5rem", sm: "2rem" }}>
                                {formatRupiah(detailData.price)}
                            </Typography>
                        </Paper>

                        {!isExactChange && (
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Total Uang Yang Diterima
                                </Typography>
                                <TextField
                                    value={actualPrice}
                                    onChange={(e) => setActualPrice(e.target.value)}
                                    placeholder="Masukkan jumlah uang yang diterima"
                                    inputProps={{ inputMode: "numeric" }}
                                    fullWidth
                                    variant="outlined"
                                    size="medium"
                                />
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={handleResetPayment}
                        disabled={uploading}
                        variant="outlined"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUpdateOrder}
                        disabled={uploading}
                        startIcon={uploading ? <Pending /> : <CheckCircle />}
                    >
                        {uploading ? "Memproses..." : "Konfirmasi Pembayaran"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* CREATE / UPDATE DIALOG */}
            <Dialog
                open={modalCreate}
                onClose={() => {
                    if (modalUpdate) {
                        handleResetUpload();
                        setModalUpdate(false);
                    } else {
                        setModalCreate(false);
                    }
                }}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    elevation: 8,
                }}
            >
                <DialogTitle sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography variant="h6" fontWeight={600}>
                        <Add sx={{ verticalAlign: 'middle', mr: 1 }} />
                        {modalUpdate ? "Edit Pesanan" : "Tambah Pesanan Baru"}
                    </Typography>
                    <IconButton
                        onClick={() => {
                            if (modalUpdate) {
                                handleResetUpload();
                                setModalUpdate(false);
                            } else {
                                setModalCreate(false);
                            }
                        }}
                        sx={{ color: 'white' }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        <FormControl fullWidth>
                            <InputLabel id="user-label">Nama Pemesan</InputLabel>
                            <Select
                                labelId="user-label"
                                label="Nama Pemesan"
                                value={dataUpload.user?.label || ""}
                                onChange={(e) => {
                                    const sel = dataDropdownSensus.find(
                                        (d) => d.value === e.target.value
                                    );
                                    if (!sel) return;
                                    setDataUpload((prev) => ({
                                        ...prev,
                                        user: {
                                            label: String(sel.value),
                                            value: String(sel.value),
                                            id: String(sel.id),
                                        },
                                    }));
                                }}
                                variant="outlined"
                            >
                                <MenuItem value="">-- Pilih Nama Pemesan --</MenuItem>
                                {dataDropdownSensus.map((d) => (
                                    <MenuItem key={String(d.id)} value={String(d.value)}>
                                        {d.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="cat2-label">Kategori Pesanan</InputLabel>
                            <Select
                                labelId="cat2-label"
                                label="Kategori Pesanan"
                                value={dataUpload.category?.label || ""}
                                onChange={(e) => {
                                    const sel = dataDropdownCategory.find(
                                        (d) => `${d.name} ${d.year}` === e.target.value
                                    );
                                    if (!sel) return;
                                    setDataUpload((prev) => ({
                                        ...prev,
                                        category: {
                                            ...prev.category,
                                            id: String(sel.id),
                                            name: String(sel.name || ""),
                                            label: `${sel.name} ${sel.year}`,
                                            value: `${sel.name} ${sel.year}`,
                                            price: String(sel.price ?? ""),
                                        },
                                    }));
                                }}
                                variant="outlined"
                            >
                                <MenuItem value="">-- Pilih Kategori Pesanan --</MenuItem>
                                {dataDropdownCategory.map((d) => (
                                    <MenuItem key={String(d.id)} value={`${d.name} ${d.year}`}>
                                        {d.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Jumlah Pesanan"
                            value={dataUpload.totalOrder}
                            onChange={(e) =>
                                setDataUpload((prev) => ({ ...prev, totalOrder: e.target.value }))
                            }
                            inputProps={{ inputMode: "numeric" }}
                            placeholder="Masukkan jumlah pesanan"
                            fullWidth
                            variant="outlined"
                            helperText="Jumlah dalam satuan pcs"
                        />

                        <TextField
                            label="Catatan Pesanan (Opsional)"
                            value={dataUpload.note}
                            onChange={(e) =>
                                setDataUpload((prev) => ({ ...prev, note: e.target.value }))
                            }
                            placeholder="Masukkan catatan tambahan..."
                            fullWidth
                            multiline
                            minRows={3}
                            variant="outlined"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={handleResetUpload}
                        disabled={uploading}
                        variant="outlined"
                    >
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateOrUpdateOrder}
                        disabled={uploading}
                        startIcon={uploading ? <Pending /> : <CheckCircle />}
                    >
                        {uploading ? "Menyimpan..." : (modalUpdate ? "Update" : "Simpan")}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced BOTTOM SHEET */}
            <Drawer
                anchor="bottom"
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxWidth: 800,
                        mx: 'auto',
                        width: '100%',
                    }
                }}
            >
                <Box sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                        <Typography variant="h5" fontWeight={700}>
                            📊 Ringkasan Lengkap
                        </Typography>
                        <IconButton onClick={() => setSheetOpen(false)}>
                            <Close />
                        </IconButton>
                    </Stack>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper elevation={2} sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom fontWeight={600}>
                                    Statistik Pesanan
                                </Typography>
                                <Stack spacing={2}>
                                    <Row label="Total Pesanan" value={String(stats.totalItems)} />
                                    <Row label="Sudah Bayar" value={String(stats.paidOrders)} />
                                    <Row label="Belum Bayar" value={String(stats.unpaidOrders)} />
                                    <Row label="Tingkat Kelunasan" value={`${stats.paymentRate.toFixed(1)}%`} />
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Paper elevation={2} sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom fontWeight={600}>
                                    Ringkasan Keuangan
                                </Typography>
                                <Stack spacing={2}>
                                    <Row label="Total Nilai Pesanan" value={formatRupiah(stats.totalValue)} />
                                    <Row label="Total Uang Diterima" value={formatRupiah(stats.totalReceived)} />
                                    <Row
                                        label="Selisih"
                                        value={formatRupiah(stats.totalValue - stats.totalReceived)}
                                        color={stats.totalValue - stats.totalReceived > 0 ? "error" : "success"}
                                    />
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={() => setSheetOpen(false)}
                            startIcon={<Close />}
                        >
                            Tutup Ringkasan
                        </Button>
                    </Box>
                </Box>
            </Drawer>
        </Box>
    );
};

// Enhanced Row for sheet
const Row: React.FC<{ label: string; value: string; color?: "primary" | "error" | "success" }> = ({ label, value, color = "primary" }) => (
    <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
    >
        <Typography variant="body1" color="text.secondary">{label}</Typography>
        <Typography variant="body1" fontWeight={700} color={`${color}.main`}>
            {value}
        </Typography>
    </Stack>
);

export default OrderListPage;