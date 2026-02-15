import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router";
import { supabase } from "../supabase/client";
import { 
    RefreshCw, 
    AlertCircle, 
    Calendar, 
    Tag, 
    ChevronRight, 
    Loader2 
} from 'lucide-react';

// --- TYPES ---
export interface OrderCategory {
    id: string;
    name: string;
    price: number;
    year: number;
}

type CategoryOrderRow = {
    id: string;
    name: string;
    year: number;
    price: string | number | null;
};

// --- HELPER FUNCTIONS ---
const formatPrice = (v: number) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(v);

// Generate warna dinamis (Hue) berdasarkan string nama
const stringHue = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
};

// --- COMPONENT: CATEGORY CARD ---
const CategoryCard = ({ data, onSelect }: { data: OrderCategory; onSelect: (c: OrderCategory) => void }) => {
    const hue = stringHue(data.name);
    
    // Style dinamis untuk background gradient
    const dynamicStyle = {
        background: `linear-gradient(135deg, hsl(${hue} 70% 96% / 1), hsl(${(hue + 60) % 360} 70% 98% / 1))`,
        borderColor: `hsl(${hue} 60% 90%)`,
    };

    const iconStyle = {
        backgroundColor: `hsl(${hue} 70% 90%)`,
        color: `hsl(${hue} 80% 30%)`,
    };

    return (
        <div 
            onClick={() => onSelect(data)}
            className="group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
            style={dynamicStyle}
        >
            {/* Dekorasi Background Abstrak */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full opacity-20 blur-2xl" 
                 style={{ backgroundColor: `hsl(${hue} 70% 60%)` }}></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                
                {/* Header Card */}
                <div className="flex justify-between items-start">
                    <div className="p-3 rounded-2xl" style={iconStyle}>
                        <Tag size={24} />
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                        <Calendar size={12} /> {data.year}
                    </span>
                </div>

                {/* Content */}
                <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1 line-clamp-1" title={data.name}>
                        {data.name}
                    </h3>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Harga Satuan</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">
                                {formatPrice(data.price)}
                            </p>
                        </div>
                        
                        <div className="w-10 h-10 rounded-full bg-white border border-white/50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function OrderCategoryScreen() {
    const [rows, setRows] = useState<OrderCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("category_order")
                .select("id,name,year,price")
                // PERUBAHAN DI SINI: Urutkan berdasarkan 'year', descending (terbaru dulu)
                .order("year", { ascending: false });

            if (error) throw error;

            const mapped: OrderCategory[] = (data as CategoryOrderRow[]).map((r) => ({
                id: String(r.id),
                name: r.name,
                year: Number(r.year),
                price: r.price === null ? 0 : Number(r.price),
            }));
            setRows(mapped);
        } catch (err: any) {
            setError(err.message);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelect = (d: OrderCategory) => {
        const selectedCategory = {
            id: d.id,
            name: d.name,
            label: `${d.name} ${d.year}`,
            value: `${d.name} ${d.year}`,
            price: String(d.price),
            year: d.year,
        };
        navigate("/category-orders/list", { state: { selectedCategory } });
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
            
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kategori Pemesanan</h1>
                    <p className="text-sm text-slate-500 mt-1">Pilih kategori untuk melihat atau membuat pesanan baru.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                        <p className="text-slate-500 font-medium">Memuat kategori...</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4 text-red-700 mb-6">
                        <AlertCircle size={24} />
                        <div>
                            <p className="font-bold">Gagal memuat data</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && rows.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Tag size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Belum ada kategori</h3>
                        <p className="text-slate-500">Data kategori pesanan masih kosong.</p>
                    </div>
                )}

                {/* Grid Data */}
                {!loading && !error && rows.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {rows.map((item) => (
                            <CategoryCard
                                key={item.id}
                                data={item}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}