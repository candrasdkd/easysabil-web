import * as React from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    CardActionArea,
    Typography,
    Chip,
    Stack,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { supabase } from "../supabase/client"; // ⬅️ sesuaikan path
import { useNavigate } from "react-router";


export interface OrderCategory {
    id: string;
    name: string;
    price: number; // mapped from "price"
    year: number;
}

export interface CategoryCardProps {
    data: OrderCategory;
    onSelect?: (c: OrderCategory) => void;
    variant?: "accent" | "glass";
    dense?: boolean;
}

const formatPrice = (v: number, currency: string = "IDR") =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(v);

// ===== Pretty helpers =====
const stringHue = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
};

const gradientFor = (name: string) => {
    const h = stringHue(name);
    return `linear-gradient(135deg, hsl(${h} 70% 55% / 0.18), hsl(${(h + 40) % 360} 70% 55% / 0.10))`;
};

const softColor = (name: string) => `hsl(${stringHue(name)} 70% 45%)`;

// ===== Variant A: Accent Top =====
const CategoryCardAccent: React.FC<{
    data: OrderCategory;
    onSelect?: (c: OrderCategory) => void;
    dense?: boolean;
}> = ({ data, onSelect, dense }) => (
    <Card
        variant="outlined"
        sx={{
            borderRadius: 4,
            height: "100%",
            overflow: "hidden",
            position: "relative",
            borderColor: (t) =>
                t.palette.mode === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
            transition: "all 160ms ease",
            "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
        }}
    >
        <Box sx={{ height: 76, background: gradientFor(data.name) }} />

        <Box sx={{ position: "absolute", top: 12, right: 12 }}>
            <Chip
                label={formatPrice(data.price)}
                color="default"
                sx={{
                    bgcolor: (t) =>
                        t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid",
                    borderColor: (t) =>
                        t.palette.mode === "dark"
                            ? "rgba(255,255,255,0.16)"
                            : "rgba(0,0,0,0.08)",
                    fontWeight: 600,
                }}
            />
        </Box>

        <CardActionArea onClick={() => onSelect?.(data)} sx={{ height: "100%" }}>
            <CardContent sx={{ py: dense ? 1.25 : 2.25 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            width: dense ? 36 : 44,
                            height: dense ? 36 : 44,
                            borderRadius: "12px",
                            bgcolor: (t) =>
                                t.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)",
                            border: "1px solid",
                            borderColor: (t) =>
                                t.palette.mode === "dark"
                                    ? "rgba(255,255,255,0.12)"
                                    : "rgba(0,0,0,0.06)",
                            display: "grid",
                            placeItems: "center",
                        }}
                    >
                        <Typography fontWeight={700} sx={{ color: softColor(data.name) }}>
                            {data.name.slice(0, 1).toUpperCase()}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                        >
                            <Typography variant={dense ? "subtitle2" : "subtitle1"} noWrap>
                                {data.name}
                            </Typography>
                            <Chip
                                size="small"
                                label={data.year}
                                sx={{ borderRadius: 1.5 }}
                                variant="outlined"
                            />
                        </Stack>

                        <Typography
                            variant={dense ? "body2" : "body1"}
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                        >
                            {formatPrice(data.price)} / unit
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </CardActionArea>
    </Card>
);

// ===== Variant B: Glass Gradient =====
const CategoryCardGlass: React.FC<{
    data: OrderCategory;
    onSelect?: (c: OrderCategory) => void;
    dense?: boolean;
}> = ({ data, onSelect, dense }) => {
    const hue = stringHue(data.name);
    return (
        <Card
            sx={{
                borderRadius: 4,
                height: "100%",
                overflow: "hidden",
                position: "relative",
                px: 0,
                background: `linear-gradient(135deg, hsl(${hue} 70% 55% / 0.16), hsl(${(hue + 60) % 360
                    } 70% 55% / 0.10))`,
                border: "1px solid",
                borderColor: (t) =>
                    t.palette.mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                boxShadow: (t) =>
                    t.palette.mode === "dark"
                        ? "inset 0 1px 0 rgba(255,255,255,0.04)"
                        : "inset 0 1px 0 rgba(255,255,255,0.5)",
                transition: "transform 160ms ease, box-shadow 160ms ease",
                "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
            }}
        >
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                        "linear-gradient(120deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.14) 35%, rgba(255,255,255,0.0) 70%)",
                    transform: "translateY(-30%) rotate(8deg)",
                }}
            />

            <CardActionArea onClick={() => onSelect?.(data)} sx={{ height: "100%" }}>
                <CardContent sx={{ p: dense ? 1.5 : 2.5 }}>
                    <Stack spacing={dense ? 1 : 1.5}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant={dense ? "subtitle2" : "h6"} noWrap>
                                {data.name}
                            </Typography>
                            <Chip
                                size="small"
                                label={data.year}
                                sx={{ bgcolor: "background.paper", backdropFilter: "blur(6px)" }}
                            />
                        </Stack>

                        <Typography variant={dense ? "h6" : "h5"} sx={{ fontWeight: 700 }}>
                            {formatPrice(data.price)}
                        </Typography>
                    </Stack>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

// ===== Wrapper to switch variant =====
const CategoryCard: React.FC<CategoryCardProps> = ({
    data,
    onSelect,
    variant = "accent",
    dense,
}) => {
    if (variant === "glass")
        return <CategoryCardGlass data={data} onSelect={onSelect} dense={dense} />;
    return <CategoryCardAccent data={data} onSelect={onSelect} dense={dense} />;
};

// ===== Screen with Supabase data =====
type CategoryOrderRow = {
    id: string;
    name: string;
    year: number;
    price: string | number | null; // Supabase price bisa balik string
};

export default function OrderCategoryScreen() {
    const [rows, setRows] = React.useState<OrderCategory[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const navigate = useNavigate();
    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from("category_order")
            .select("id,name,year,price")
            .order("name", { ascending: true });

        if (error) {
            setError(error.message);
            setRows([]);
        } else {
            const mapped: OrderCategory[] =
                (data as CategoryOrderRow[]).map((r) => ({
                    id: String(r.id),
                    name: r.name,
                    year: Number(r.year),
                    // pastikan number; supabase price kadang string
                    price: r.price === null ? 0 : Number(r.price),
                })) ?? [];
            setRows(mapped);
        }
        setLoading(false);
    }, []);

    const handleSelect = (d: OrderCategory) => {
        // Bentuk payload sesuai tipe SelectedCategoryProps di OrderListPage
        const selectedCategory = {
            id: d.id,
            name: d.name,
            label: `${d.name} ${d.year}`,
            value: `${d.name} ${d.year}`,
            price: String(d.price),
            year: d.year,
        };
        navigate("/orders", { state: { selectedCategory } }); // ⬅️ kirim via state
    };


    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <Box p={3}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <Typography variant="h6" fontWeight={700}>
                    Kategori Pemesanan
                </Typography>
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchData} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {loading && (
                <Box display="grid" py={6}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Gagal memuat data: {error}
                </Alert>
            )}

            {!loading && !error && rows.length === 0 && (
                <Alert severity="info">Belum ada data kategori.</Alert>
            )}

            <Grid container spacing={3}>
                {rows.map((item) => (
                    <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <CategoryCard
                            data={item}
                            variant="glass"
                            onSelect={handleSelect}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
