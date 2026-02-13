import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router";
import { supabase } from "../supabase/client";
import dayjs from "dayjs";
import { 
    Search, Plus, Filter, Share2, User, 
    ShoppingBag, CheckCircle2, CreditCard, Edit2, 
    Trash2, X, TrendingUp, AlertCircle,
    Loader2, ChevronDown, ListOrdered, ClipboardCheck,
    Banknote, Wallet, ArrowRightLeft, AlertTriangle,
    PieChart, Lock // Tambah icon Lock
} from 'lucide-react';

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
    money_holder?: string | null;
    payment_method?: string | null;
    created_at?: string;
};

const MONEY_HOLDERS = ['Sutoyo', 'Riko', 'Candra', 'Fahmi', 'Fachih'];
const PAYMENT_METHODS = ['Cash', 'Transfer'];
const AUTH_KEY = 'order_session'; // Key session storage
const SESSION_DURATION = 30 * 60 * 1000; // 30 Menit

const formatRupiah = (n: string | number): string => {
    const num = typeof n === "string" ? parseInt(n.replace(/[^0-9-]/g, ""), 10) || 0 : Number(n) || 0;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

const OrderListPage: React.FC = () => {
    const location = useLocation();
    const routeState = location.state as { selectedCategory?: SelectedCategoryProps } | undefined;

    // --- State Management ---
    const [dataOrder, setDataOrder] = useState<DataOrder[]>([]);
    const [dataDropdownSensus, setDataDropdownSensus] = useState<DataDropdown[]>([]);
    const [dataDropdownCategory, setDataDropdownCategory] = useState<DataDropdown[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // UI States
    const [searchQuery, setSearchQuery] = useState("");
    const [modalPayment, setModalPayment] = useState(false);
    const [modalCreate, setModalCreate] = useState(false);
    const [modalFilter, setModalFilter] = useState(false);
    const [modalSummary, setModalSummary] = useState(false);
    const [modalDelete, setModalDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // AUTH & PASSWORD STATES
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const storedTimestamp = localStorage.getItem(AUTH_KEY);
        if (storedTimestamp) {
            const now = Date.now();
            if (now - parseInt(storedTimestamp, 10) < SESSION_DURATION) return true;
            localStorage.removeItem(AUTH_KEY);
        }
        return false;
    });
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'edit' | 'delete', payload?: any } | null>(null);

    const [uploading, setUploading] = useState(false);
    const [showAllData, setShowAllData] = useState(false);
    const [modalUpdate, setModalUpdate] = useState(false);

    // Searchable Member Dropdown
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const memberRef = useRef<HTMLDivElement>(null);

    // Filter Settings
    const [settingFilter, setSettingFilter] = useState({
        category: routeState?.selectedCategory || { label: "", value: "", id: "", name: "", price: "" },
        isPayment: null as boolean | null,
    });

    // Form Data
    const [dataUpload, setDataUpload] = useState({
        idCard: null as number | null,
        user: { label: "", value: "", id: "" },
        category: { label: "", value: "", id: "", name: "", price: "" } as SelectedCategoryProps,
        totalOrder: "",
        note: "",
        isPayment: false,
        moneyHolder: "",
        paymentMethod: "Cash",
        actualPrice: ""
    });

    // Payment Logic State (Quick Pay Modal)
    const [actualPricePay, setActualPricePay] = useState("");
    const [isExactChange, setIsExactChange] = useState(false);
    const [paymentDetail, setPaymentDetail] = useState({ id: 0, price: 0, status: false });

    // --- Logic: Filter & Statistics ---
    const filteredOrder = useMemo(() => {
        return dataOrder.filter((item) => {
            const matchesSearch = searchQuery === "" || item.user_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPayment = settingFilter.isPayment === null || item.is_payment === settingFilter.isPayment;
            return matchesSearch && matchesPayment;
        });
    }, [dataOrder, searchQuery, settingFilter.isPayment]);

    const stats = useMemo(() => {
        const totalItems = filteredOrder.reduce((acc, curr) => acc + curr.total_order, 0);
        const paidOrders = filteredOrder.filter(item => item.is_payment).length;
        const totalValue = filteredOrder.reduce((acc, curr) => acc + (curr.unit_price * curr.total_order), 0);
        const totalReceived = filteredOrder.reduce((acc, curr) => acc + (curr.actual_price || 0), 0);
        
        const holders: Record<string, number> = {};
        MONEY_HOLDERS.forEach(h => holders[h] = 0); 
        
        const methods: Record<string, number> = { 'Cash': 0, 'Transfer': 0 };

        filteredOrder.forEach(order => {
            if (order.is_payment && order.actual_price > 0) {
                if (order.money_holder) holders[order.money_holder] = (holders[order.money_holder] || 0) + order.actual_price;
                if (order.payment_method) methods[order.payment_method] = (methods[order.payment_method] || 0) + order.actual_price;
            }
        });

        return {
            totalItems,
            paidOrders,
            unpaidOrders: filteredOrder.length - paidOrders,
            paymentRate: filteredOrder.length > 0 ? (paidOrders / filteredOrder.length) * 100 : 0,
            totalValue,
            totalReceived,
            gap: totalValue - totalReceived,
            holders,
            methods
        };
    }, [filteredOrder]);

    const filteredMembers = dataDropdownSensus.filter(m => 
        m.label.toLowerCase().includes(memberSearch.toLowerCase())
    );

    // --- Data Fetching ---
    const fetchDataOrder = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from("list_order").select("*").order("created_at", { ascending: false });
            if (settingFilter.category.id && !showAllData) {
                query = query.eq("id_category_order", settingFilter.category.id);
            }
            const { data, error } = await query;
            if (error) throw error;
            setDataOrder((data as DataOrder[]) || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [settingFilter.category.id, showAllData]);

    const fetchDropdowns = useCallback(async () => {
        const [sensusRes, catRes] = await Promise.all([
            supabase.from("list_sensus").select("uuid,name").order("name", { ascending: true }),
            supabase.from("category_order").select("*").order("year", { ascending: false })
        ]);

        if (!sensusRes.error) {
            setDataDropdownSensus(sensusRes.data.map(i => ({ label: i.name, value: i.name, id: i.uuid })));
        }
        if (!catRes.error) {
            setDataDropdownCategory(catRes.data.map(i => ({ 
                ...i, label: `${i.name} ${i.year}`, value: `${i.name} ${i.year}`, id: i.id 
            })));
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
        fetchDataOrder();
    }, [fetchDataOrder, fetchDropdowns]);

    // --- Action & Auth Handlers ---

    // 1. Centralized Action Handler
    const handleAction = (type: 'create' | 'edit' | 'delete', payload?: any) => {
        // Cek apakah sesi masih valid
        const stored = localStorage.getItem(AUTH_KEY);
        const isValid = stored && (Date.now() - parseInt(stored, 10) < SESSION_DURATION);

        if (isAuthenticated && isValid) {
            localStorage.setItem(AUTH_KEY, Date.now().toString()); // Refresh session
            executeAction(type, payload);
        } else {
            setIsAuthenticated(false);
            setPendingAction({ type, payload });
            setOpenPasswordDialog(true);
        }
    };

    const executeAction = (type: 'create' | 'edit' | 'delete', payload?: any) => {
        if (type === 'create') {
            resetForm();
            setModalUpdate(false);
            setModalCreate(true);
        } else if (type === 'edit') {
            const order = payload as DataOrder;
            setDataUpload({
                idCard: order.id,
                user: { label: order.user_name, value: order.user_name, id: String(order.user_id) },
                category: { label: order.name_category, value: order.name_category, id: String(order.id_category_order), name: order.name_category, price: String(order.unit_price) },
                totalOrder: String(order.total_order),
                note: order.note || "",
                isPayment: order.is_payment,
                moneyHolder: order.money_holder || "",
                paymentMethod: order.payment_method || "Cash",
                actualPrice: String(order.actual_price || "")
            });
            setMemberSearch(order.user_name);
            setModalUpdate(true);
            setModalCreate(true);
        } else if (type === 'delete') {
            setDeleteId(payload);
            setModalDelete(true);
        }
    };

    const handlePasswordSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!passwordInput.trim()) return;

        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === "admin354") {
                localStorage.setItem(AUTH_KEY, Date.now().toString());
                setIsAuthenticated(true);
                setOpenPasswordDialog(false);
                setPasswordInput("");
                if (pendingAction) executeAction(pendingAction.type, pendingAction.payload);
            } else {
                alert("Password Salah!");
            }
            setLoadingPassword(false);
        }, 800);
    };

    const handleLockSession = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
        alert("Sesi dikunci.");
    };

    // ------------------------------------

    // --- Auto Calculate Price for Form ---
    useEffect(() => {
        if (dataUpload.isPayment && dataUpload.totalOrder && dataUpload.category.price) {
            if(dataUpload.actualPrice === "") {
                const total = parseInt(dataUpload.totalOrder) * parseInt(dataUpload.category.price);
                if (!isNaN(total)) {
                    setDataUpload(prev => ({ ...prev, actualPrice: String(total) }));
                }
            }
        }
    }, [dataUpload.isPayment, dataUpload.totalOrder, dataUpload.category.price]);


    const handleUpdatePayment = async () => {
        if (!isExactChange && !actualPricePay) return alert("Masukkan jumlah uang");
        setUploading(true);
        try {
            const numericPrice = isExactChange ? paymentDetail.price : parseInt(actualPricePay.replace(/[^0-9]/g, ""), 10);
            const { error } = await supabase.from("list_order")
                .update({ 
                    actual_price: numericPrice, 
                    is_payment: true,
                    payment_method: 'Cash', 
                    money_holder: 'Fachih' // Default for quick pay
                })
                .eq("id", paymentDetail.id);

            if (error) throw error;
            await fetchDataOrder();
            setModalPayment(false);
            setActualPricePay("");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveOrder = async () => {
        if (!dataUpload.user.id || !dataUpload.category.id || !dataUpload.totalOrder) return alert("Lengkapi data pemesan & kategori");
        
        if (dataUpload.isPayment) {
            if (!dataUpload.moneyHolder) return alert("Pilih siapa pemegang uang");
            if (!dataUpload.actualPrice) return alert("Masukkan nominal uang");
        }

        setUploading(true);
        try {
            const body = {
                user_name: dataUpload.user.value,
                user_id: dataUpload.user.id,
                id_category_order: parseInt(String(dataUpload.category.id)),
                name_category: dataUpload.category.label,
                total_order: parseInt(dataUpload.totalOrder),
                unit_price: parseInt(String(dataUpload.category.price)),
                note: dataUpload.note,
                is_payment: dataUpload.isPayment,
                money_holder: dataUpload.isPayment ? dataUpload.moneyHolder : null,
                payment_method: dataUpload.isPayment ? dataUpload.paymentMethod : null,
                actual_price: dataUpload.isPayment ? parseInt(dataUpload.actualPrice.replace(/[^0-9]/g, ""), 10) : 0
            };

            const query = modalUpdate 
                ? supabase.from("list_order").update(body).eq("id", dataUpload.idCard)
                : supabase.from("list_order").insert([body]);

            const { error } = await query;
            if (error) throw error;
            
            await fetchDataOrder();
            setModalCreate(false);
            setModalUpdate(false);
            resetForm();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setUploading(true);
        try {
            const { error } = await supabase.from("list_order").delete().eq("id", deleteId);
            if (error) throw error;
            await fetchDataOrder();
            setModalDelete(false);
            setDeleteId(null);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setDataUpload({ 
            idCard: null,
            user: { label: "", value: "", id: "" }, 
            category: { label: "", value: "", id: "", name: "", price: "" },
            totalOrder: "", 
            note: "",
            isPayment: false,
            moneyHolder: "",
            paymentMethod: "Cash",
            actualPrice: ""
        });
        setMemberSearch("");
    }

const copyReport = () => {
        const currentDate = dayjs().format("DD MMM YYYY, HH:mm");
        const categoryLabel = settingFilter.category.label || "SEMUA KATEGORI";

        // 1. Header Laporan
        let text = `*📦 LAPORAN PESANAN*\n`;
        text += `🏷️ Kategori: ${categoryLabel}\n`;
        text += `🗓️ Update: ${currentDate}\n`;
        text += `=========================\n`;

        // 2. Pisahkan Data (Belum Bayar vs Sudah Bayar)
        const unpaid = filteredOrder.filter(item => !item.is_payment);
        const paid = filteredOrder.filter(item => item.is_payment);

        // 3. Bagian BELUM LUNAS (Prioritas ditampilkan di atas)
        if (unpaid.length > 0) {
            text += `\n*⏳ BELUM LUNAS (${unpaid.length} Orang)*\n`;
            unpaid.forEach((item, idx) => {
                const tagihan = item.unit_price * item.total_order;
                text += `${idx + 1}. *${item.user_name}*\n`;
                text += `   └ 📦 ${item.total_order} pcs  💰 ${formatRupiah(tagihan)}\n`;
                if (item.note) text += `   └ 📝 _${item.note}_\n`;
            });
        }

        // 4. Bagian SUDAH LUNAS
        if (paid.length > 0) {
            text += `\n*✅ SUDAH LUNAS (${paid.length} Orang)*\n`;
            paid.forEach((item, idx) => {
                text += `${idx + 1}. ${item.user_name} (${item.total_order} pcs)\n`;
                // Opsional: Tampilkan detail pembayaran jika perlu
                // text += `   └ Diterima: ${formatRupiah(item.actual_price)} via ${item.payment_method}\n`; 
            });
        }

        // 5. Footer Ringkasan Keuangan
        text += `\n=========================\n`;
        text += `*📊 RINGKASAN KEUANGAN*\n`;
        text += `📦 Total Barang: ${stats.totalItems} pcs\n`;
        text += `💰 Potensi Omzet: ${formatRupiah(stats.totalValue)}\n`;
        text += `-------------------------\n`;
        text += `💵 Uang Masuk: ${formatRupiah(stats.totalReceived)}\n`;
        
        if (stats.gap > 0) {
            text += `⚠️ *Belum Tertagih: ${formatRupiah(stats.gap)}*\n`;
        } else {
            text += `✨ *STATUS: LUNAS SEMUA* ✨\n`;
        }

        // 6. Copy ke Clipboard
        navigator.clipboard.writeText(text).then(() => {
            alert("Laporan berhasil disalin! Siap ditempel ke WhatsApp.");
        }).catch((err) => {
            console.error('Gagal menyalin: ', err);
            alert("Gagal menyalin teks.");
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberRef.current && !memberRef.current.contains(event.target as Node)) setIsMemberDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingBag className="text-indigo-600" /> Daftar Pesanan
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {settingFilter.category.label || "Semua Kategori"} • {filteredOrder.length} Data
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                            {isAuthenticated && (
                                <button onClick={handleLockSession} className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold border border-rose-100 hover:bg-rose-100 transition-all mr-2">
                                    <Lock size={16} /> Kunci
                                </button>
                            )}
                            <button 
                                onClick={copyReport}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all"
                            >
                                <Share2 size={18} /> Bagikan
                            </button>
                            <button 
                                onClick={() => setModalFilter(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all"
                            >
                                <Filter size={18} /> Filter
                            </button>
                            <button 
                                onClick={() => handleAction('create')}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                            >
                                <Plus size={18} /> Tambah
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Cari nama pemesan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm text-lg"
                    />
                </div>

                {/* Loading / Error States */}
                {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>}
                {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 flex items-center gap-3"><AlertCircle /> {error}</div>}

                {/* Orders Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredOrder.length > 0 ? filteredOrder.map((order) => (
                            <div key={order.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-2xl ${order.is_payment ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 leading-tight">{order.user_name}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.is_payment ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {order.is_payment ? 'Lunas' : 'Belum Bayar'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleAction('edit', order)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleAction('delete', order.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Item</span>
                                        <span className="font-semibold text-slate-800">{order.name_category}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Jumlah</span>
                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 rounded-lg">{order.total_order} pcs</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Tagihan</p>
                                            <p className="text-lg font-black text-slate-900">{formatRupiah(order.unit_price * order.total_order)}</p>
                                        </div>
                                        {order.actual_price > 0 && (
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                                    Diterima ({order.money_holder || '?'})
                                                </p>
                                                <p className="text-sm font-bold text-emerald-600">{formatRupiah(order.actual_price)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {order.note && (
                                    <div className="mb-4 p-2 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                                        "{order.note}"
                                    </div>
                                )}

                                {!order.is_payment && (
                                    <button 
                                        onClick={() => {
                                            setPaymentDetail({ id: order.id, price: order.unit_price * order.total_order, status: false });
                                            setModalPayment(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                                    >
                                        <CreditCard size={18} /> Bayar Sekarang
                                    </button>
                                )}
                            </div>
                        )) : (
                            <div className="col-span-full py-20 text-center">
                                <div className="bg-white inline-block p-6 rounded-full mb-4 shadow-sm border border-slate-100">
                                    <ShoppingBag size={48} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Tidak Ada Pesanan</h3>
                                <p className="text-slate-500">Coba ubah filter atau tambah pesanan baru.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- FAB Summary Button --- */}
            <button 
                onClick={() => setModalSummary(true)}
                className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-full font-bold shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all z-40"
            >
                <TrendingUp size={20} />
                <span className="hidden sm:inline">Lihat Ringkasan</span>
            </button>

            {/* --- Modals --- */}
            
            {/* Modal: Summary (DETAILED) */}
            {modalSummary && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
                    <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="font-black text-2xl text-slate-900 flex items-center gap-3">
                                <TrendingUp className="text-emerald-500" /> Ringkasan Lengkap
                            </h3>
                            <button onClick={() => setModalSummary(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X /></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto">
                            {/* Top Stats Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-3xl text-center border border-slate-100">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Item</p>
                                    <p className="text-xl font-black text-slate-800">{stats.totalItems}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-3xl text-center border border-emerald-100">
                                    <p className="text-[10px] uppercase font-bold text-emerald-500 mb-1">Lunas</p>
                                    <p className="text-xl font-black text-emerald-700">{stats.paidOrders}</p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-3xl text-center border border-amber-100">
                                    <p className="text-[10px] uppercase font-bold text-amber-500 mb-1">Hutang</p>
                                    <p className="text-xl font-black text-amber-700">{stats.unpaidOrders}</p>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-3xl text-center border border-indigo-100">
                                    <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">Rate</p>
                                    <p className="text-xl font-black text-indigo-700">{stats.paymentRate.toFixed(0)}%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Financial Summary */}
                                <div className="space-y-6">
                                    <h4 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                                        <PieChart size={20} className="text-slate-400" /> Keuangan
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-5 bg-slate-900 text-white rounded-[2rem]">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white/10 rounded-2xl"><CreditCard /></div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-medium">POTENSI TOTAL</p>
                                                    <span className="font-bold text-lg">Nilai Pesanan</span>
                                                </div>
                                            </div>
                                            <span className="text-xl font-black">{formatRupiah(stats.totalValue)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-5 bg-emerald-600 text-white rounded-[2rem]">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white/10 rounded-2xl"><Banknote /></div>
                                                <div>
                                                    <p className="text-xs text-emerald-200 font-medium">UANG MASUK</p>
                                                    <span className="font-bold text-lg">Total Diterima</span>
                                                </div>
                                            </div>
                                            <span className="text-xl font-black">{formatRupiah(stats.totalReceived)}</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                                <p className="text-xs font-bold text-slate-400 mb-1">CASH</p>
                                                <p className="text-lg font-black text-slate-800">{formatRupiah(stats.methods['Cash'] || 0)}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                                <p className="text-xs font-bold text-slate-400 mb-1">TRANSFER</p>
                                                <p className="text-lg font-black text-slate-800">{formatRupiah(stats.methods['Transfer'] || 0)}</p>
                                            </div>
                                        </div>

                                        {stats.gap > 0 && (
                                            <div className="flex justify-between items-center p-5 bg-rose-50 border border-rose-100 rounded-[2rem] text-rose-700">
                                                <span className="font-bold">Sisa Belum Dibayar</span>
                                                <span className="text-xl font-black">{formatRupiah(stats.gap)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Money Holders Breakdown */}
                                <div className="space-y-6">
                                    <h4 className="font-bold text-lg text-slate-700 flex items-center gap-2">
                                        <Wallet size={20} className="text-slate-400" /> Rincian Pemegang Uang
                                    </h4>
                                    
                                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
                                        <div className="space-y-4">
                                            {MONEY_HOLDERS.map(holder => {
                                                const amount = stats.holders[holder] || 0;
                                                return (
                                                    <div key={holder} className="flex items-center justify-between pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${amount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                                                {holder.charAt(0)}
                                                            </div>
                                                            <span className={`font-medium ${amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{holder}</span>
                                                        </div>
                                                        <span className={`font-bold ${amount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                            {amount > 0 ? formatRupiah(amount) : '-'}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Terpegang</span>
                                            <span className="text-lg font-black text-indigo-700">{formatRupiah(stats.totalReceived)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setModalSummary(false)} className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-sm">Tutup Ringkasan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Create/Update */}
            {modalCreate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-slate-800">{modalUpdate ? "Edit Pesanan" : "Pesanan Baru"}</h3>
                            <button onClick={() => { setModalCreate(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X /></button>
                        </div>
                        <div className="p-8 space-y-5 overflow-y-auto">
                            {/* Searchable Member Dropdown */}
                            <div className="space-y-2" ref={memberRef}>
                                <label className="text-sm font-bold text-slate-700">Nama Pemesan</label>
                                <div className="relative">
                                    <div 
                                        className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 cursor-pointer focus-within:border-indigo-500 focus-within:bg-white transition-all"
                                        onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                                    >
                                        <Search className="text-slate-400 mr-3" size={18} />
                                        <input 
                                            type="text"
                                            placeholder="Cari nama..."
                                            className="bg-transparent outline-none w-full font-medium"
                                            value={memberSearch}
                                            onChange={(e) => { setMemberSearch(e.target.value); setIsMemberDropdownOpen(true); }}
                                        />
                                        <ChevronDown className={`text-slate-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                                    </div>
                                    
                                    {isMemberDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in zoom-in-95 duration-150">
                                            {filteredMembers.length > 0 ? filteredMembers.map(m => (
                                                <div 
                                                    key={m.id}
                                                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                                                    onClick={() => {
                                                        setDataUpload({ ...dataUpload, user: { label: m.label, value: m.label, id: String(m.id) } });
                                                        setMemberSearch(m.label);
                                                        setIsMemberDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="font-medium text-slate-700">{m.label}</span>
                                                    {dataUpload.user.id === String(m.id) && <CheckCircle2 className="text-indigo-600" size={16} />}
                                                </div>
                                            )) : <div className="px-4 py-6 text-center text-slate-400 text-sm italic">Nama tidak ditemukan</div>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Kategori Item</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
                                    value={dataUpload.category.label}
                                    onChange={(e) => {
                                        const sel = dataDropdownCategory.find(d => d.value === e.target.value);
                                        if (sel) setDataUpload({...dataUpload, category: { id: String(sel.id), name: String(sel.name), label: sel.label, value: sel.label, price: String(sel.price) }});
                                    }}
                                >
                                    <option value="">Pilih Kategori</option>
                                    {dataDropdownCategory.map(c => <option key={c.id} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Jumlah Pesanan (pcs)</label>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                                    <ListOrdered className="text-slate-400 mr-3" size={18} />
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        className="bg-transparent outline-none w-full font-bold text-lg"
                                        value={dataUpload.totalOrder}
                                        onChange={(e) => setDataUpload({...dataUpload, totalOrder: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* --- PAYMENT TOGGLE SECTION (MOVED UP) --- */}
                            <div className="pt-2">
                                <label className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border-2 transition-all ${dataUpload.isPayment ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${dataUpload.isPayment ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <span className={`font-bold ${dataUpload.isPayment ? 'text-emerald-800' : 'text-slate-600'}`}>Sudah Bayar Lunas?</span>
                                    </div>
                                    <div className={`w-12 h-7 rounded-full p-1 transition-colors ${dataUpload.isPayment ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${dataUpload.isPayment ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={dataUpload.isPayment} onChange={(e) => setDataUpload({...dataUpload, isPayment: e.target.checked})} />
                                </label>

                                {/* CONDITIONAL PAYMENT FIELDS */}
                                {dataUpload.isPayment && (
                                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 fade-in">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Pemegang Uang</label>
                                                <div className="relative">
                                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <select 
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 appearance-none text-sm font-medium"
                                                        value={dataUpload.moneyHolder}
                                                        onChange={(e) => setDataUpload({...dataUpload, moneyHolder: e.target.value})}
                                                    >
                                                        <option value="">Pilih...</option>
                                                        {MONEY_HOLDERS.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">Metode</label>
                                                <div className="relative">
                                                    <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <select 
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 appearance-none text-sm font-medium"
                                                        value={dataUpload.paymentMethod}
                                                        onChange={(e) => setDataUpload({...dataUpload, paymentMethod: e.target.value})}
                                                    >
                                                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Nominal (Rp)</label>
                                            <div className="relative">
                                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                                <input 
                                                    type="number"
                                                    className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl outline-none focus:border-emerald-500 text-emerald-800 font-bold"
                                                    value={dataUpload.actualPrice}
                                                    onChange={(e) => setDataUpload({...dataUpload, actualPrice: e.target.value})}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-bold text-slate-700">Catatan (Opsional)</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all text-sm min-h-[80px]"
                                    placeholder="Contoh: Ukuran L, warna hitam, dsb..."
                                    value={dataUpload.note}
                                    onChange={(e) => setDataUpload({...dataUpload, note: e.target.value})}
                                />
                            </div>

                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => { setModalCreate(false); resetForm(); }} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">Batal</button>
                            <button 
                                onClick={handleSaveOrder} 
                                disabled={uploading}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex justify-center items-center gap-2"
                            >
                                {uploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                {modalUpdate ? "Update" : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Delete Confirmation (Custom) */}
            {modalDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Pesanan?</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Data yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin melanjutkan?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setModalDelete(false); setDeleteId(null); }}
                                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={uploading}
                                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex justify-center items-center gap-2"
                            >
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Password */}
            {openPasswordDialog && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Verifikasi Diperlukan</h3>
                        <p className="text-sm text-slate-500 mb-6">Masukkan password admin untuk melanjutkan.</p>
                        <form onSubmit={handlePasswordSubmit}>
                            <input 
                                type="password" 
                                autoFocus
                                placeholder="Password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className="w-full px-4 py-3 text-center text-lg tracking-widest rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none mb-6"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setOpenPasswordDialog(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
                                <button type="submit" disabled={loadingPassword} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">{loadingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Lanjut'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Payment (Quick Pay) */}
            {modalPayment && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-xl flex items-center gap-2"><CreditCard /> Pembayaran</h3>
                            <button onClick={() => setModalPayment(false)}><X /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-slate-500 mb-1">Total Tagihan</p>
                                <h2 className="text-4xl font-black text-slate-900">{formatRupiah(paymentDetail.price)}</h2>
                            </div>
                            
                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer border-2 border-transparent has-[:checked]:border-indigo-600 transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={isExactChange} 
                                    onChange={(e) => setIsExactChange(e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-700">Uang Pas</span>
                            </label>

                            {!isExactChange && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Uang Diterima</label>
                                    <input 
                                        type="number"
                                        placeholder="Masukkan jumlah..."
                                        value={actualPricePay}
                                        onChange={(e) => setActualPricePay(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all text-xl font-bold"
                                    />
                                </div>
                            )}

                            <button 
                                onClick={handleUpdatePayment}
                                disabled={uploading}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {uploading ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
                                Konfirmasi Bayar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal: Filter */}
            {modalFilter && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Filter size={18} /> Filter Data</h3>
                            <button onClick={() => setModalFilter(false)}><X /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategori</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    value={settingFilter.category.label}
                                    onChange={(e) => {
                                        const sel = dataDropdownCategory.find(d => d.value === e.target.value);
                                        if (sel) setSettingFilter({...settingFilter, category: { ...sel, id: String(sel.id), label: sel.label, value: sel.label, name: String(sel.name), price: String(sel.price) }});
                                    }}
                                >
                                    <option value="">Semua Kategori</option>
                                    {dataDropdownCategory.map(c => <option key={c.id} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Bayar</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Semua', val: null },
                                        { label: 'Lunas', val: true },
                                        { label: 'Belum', val: false }
                                    ].map(s => (
                                        <button 
                                            key={s.label}
                                            onClick={() => setSettingFilter({...settingFilter, isPayment: s.val})}
                                            className={`py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${settingFilter.isPayment === s.val ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={() => { 
                                    setSettingFilter({ category: { label: "", value: "", id: "", name: "", price: "" }, isPayment: null });
                                    setShowAllData(false);
                                }}
                                className="px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all"
                            >
                                Reset
                            </button>
                            <button onClick={() => { fetchDataOrder(); setModalFilter(false); }} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">Terapkan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Icon placeholders used: Save
const Save = ({ size }: { size: number }) => <CheckCircle2 size={size} />;

export default OrderListPage;