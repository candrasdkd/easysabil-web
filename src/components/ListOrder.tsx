import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router";
import dayjs from "dayjs";
import {
    Search, Loader2, AlertCircle, TrendingUp, ShoppingBag
} from 'lucide-react';

import { useOrders, useOrderDropdowns } from "../hooks/useOrders";
import { useOrderStats } from "../hooks/useOrderStats";
import type { DataOrder, SelectedCategoryProps } from "../types/Order";
import { formatRupiah } from "../utils/formatters";

// Sub-components
import OrderHeader from "./OrderHeader";
import OrderCard from "./OrderCard";
import OrderSummaryModal from "./OrderSummaryModal";
import OrderFormModal from "./OrderFormModal";
import PaymentModal from "./PaymentModal";
import PasswordDialog from "./PasswordDialog";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import OrderFilterModal from "./OrderFilterModal";

const AUTH_KEY = 'order_session';
const SESSION_DURATION = 30 * 60 * 1000;

const OrderListPage: React.FC = () => {
    const location = useLocation();
    const routeState = location.state as { selectedCategory?: SelectedCategoryProps } | undefined;

    // --- Hooks ---
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllData] = useState(false);
    const [settingFilter, setSettingFilter] = useState({
        category: routeState?.selectedCategory || { label: "Semua Kategori", value: "", id: "", name: "", price: "" },
        isPayment: null as boolean | null,
    });

    const {
        dataOrder, loading, error, uploading,
        saveOrder, deleteOrder, updatePayment
    } = useOrders(settingFilter.category.id, showAllData);

    const { dataDropdownSensus, dataDropdownCategory } = useOrderDropdowns();

    // --- State Management ---
    const [modalPayment, setModalPayment] = useState(false);
    const [modalCreate, setModalCreate] = useState(false);
    const [modalSummary, setModalSummary] = useState(false);
    const [modalFilter, setModalFilter] = useState(false);
    const [modalDelete, setModalDelete] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

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
    const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'edit' | 'delete', payload?: DataOrder | number } | null>(null);

    const [modalUpdate, setModalUpdate] = useState(false);
    const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const memberRef = useRef<HTMLDivElement>(null);

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

    const [actualPricePay, setActualPricePay] = useState("");
    const [isExactChange, setIsExactChange] = useState(false);
    const [paymentDetail, setPaymentDetail] = useState({ id: 0, price: 0 });

    // --- Memoized Values ---
    const filteredOrder = useMemo(() => {
        return dataOrder.filter((item) => {
            const matchesSearch = searchQuery === "" || item.user_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPayment = settingFilter.isPayment === null || item.is_payment === settingFilter.isPayment;
            return matchesSearch && matchesPayment;
        });
    }, [dataOrder, searchQuery, settingFilter.isPayment]);

    const stats = useOrderStats(filteredOrder);

    const filteredMembers = useMemo(() =>
        dataDropdownSensus.filter(m => m.label.toLowerCase().includes(memberSearch.toLowerCase())),
        [dataDropdownSensus, memberSearch]
    );

    // --- Handlers ---
    const handleAction = (type: 'create' | 'edit' | 'delete', payload?: DataOrder | number) => {
        const stored = localStorage.getItem(AUTH_KEY);
        const isValid = stored && (Date.now() - parseInt(stored, 10) < SESSION_DURATION);

        if (isAuthenticated && isValid) {
            if (stored) {
                localStorage.setItem(AUTH_KEY, Date.now().toString());
            }
            executeAction(type, payload);
        } else {
            setIsAuthenticated(false);
            setPendingAction({ type, payload });
            setOpenPasswordDialog(true);
        }
    };

    const executeAction = (type: 'create' | 'edit' | 'delete', payload?: DataOrder | number) => {
        if (type === 'create') {
            resetForm();
            setModalUpdate(false);
            setModalCreate(true);
        } else if (type === 'edit') {
            const order = payload as DataOrder;
            setDataUpload({
                idCard: order.id,
                user: { label: order.user_name, value: order.user_name, id: String(order.user_id) },
                category: {
                    label: order.name_category,
                    value: order.name_category,
                    id: String(order.id_category_order),
                    name: order.name_category,
                    price: String(order.unit_price)
                } as SelectedCategoryProps,
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
            if (typeof payload === 'number') {
                setDeleteId(payload);
                setModalDelete(true);
            }
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

    const handleSaveOrder = async () => {
        if (!dataUpload.user.id || !dataUpload.category.id || !dataUpload.totalOrder) {
            return alert("⚠️ Mohon lengkapi: Nama Pemesan, Kategori, dan Jumlah Pesanan.");
        }

        if (dataUpload.isPayment) {
            if (!dataUpload.moneyHolder?.trim()) return alert("⚠️ Harap pilih siapa 'Pemegang Uang'.");
            if (!dataUpload.paymentMethod?.trim()) return alert("⚠️ Harap pilih 'Metode Pembayaran'.");
            const cleanPrice = String(dataUpload.actualPrice).replace(/[^0-9]/g, "");
            if (!cleanPrice || parseInt(cleanPrice, 10) <= 0) return alert("⚠️ Harap masukkan 'Nominal Uang' yang diterima.");
        }

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
            actual_price: dataUpload.isPayment ? parseInt(String(dataUpload.actualPrice).replace(/[^0-9]/g, ""), 10) : 0
        };

        const result = await saveOrder(body, modalUpdate, dataUpload.idCard);
        if (result.success) {
            setModalCreate(false);
            setModalUpdate(false);
            resetForm();
        } else {
            alert(result.error);
        }
    };

    const handleQuickPay = async () => {
        if (!isExactChange && !actualPricePay) return alert("Masukkan jumlah uang");
        const numericPrice = isExactChange ? paymentDetail.price : parseInt(actualPricePay.replace(/[^0-9]/g, ""), 10);

        const result = await updatePayment(paymentDetail.id, numericPrice);
        if (result.success) {
            setModalPayment(false);
            setActualPricePay("");
        } else {
            alert(result.error);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const result = await deleteOrder(deleteId);
        if (result.success) {
            setModalDelete(false);
            setDeleteId(null);
        } else {
            alert(result.error);
        }
    };

    const resetForm = () => {
        setDataUpload({
            idCard: null,
            user: { label: "", value: "", id: "" },
            category: { label: "", value: "", id: "", name: "", price: "" },
            totalOrder: "", note: "",
            isPayment: false, moneyHolder: "", paymentMethod: "Cash", actualPrice: ""
        });
        setMemberSearch("");
    }

    const copyReport = () => {
        const currentDate = dayjs().format("DD MMM YYYY, HH:mm");
        const categoryLabel = settingFilter.category.label || "SEMUA KATEGORI";

        let text = `*📦 LAPORAN PESANAN*\n🏷️ Kategori: ${categoryLabel}\n🗓️ Update: ${currentDate}\n=========================\n`;
        const unpaid = filteredOrder.filter(item => !item.is_payment);
        const paid = filteredOrder.filter(item => item.is_payment);

        if (unpaid.length > 0) {
            text += `\n*⏳ BELUM LUNAS (${unpaid.length} Orang)*\n`;
            unpaid.forEach((item, idx) => {
                text += `${idx + 1}. *${item.user_name}*\n   └ 📦 ${item.total_order} pcs  💰 ${formatRupiah(item.unit_price * item.total_order)}\n${item.note ? `   └ 📝 _${item.note}_\n` : ''}`;
            });
        }
        if (paid.length > 0) {
            text += `\n*✅ SUDAH LUNAS (${paid.length} Orang)*\n`;
            paid.forEach((item, idx) => text += `${idx + 1}. ${item.user_name} (${item.total_order} pcs)\n`);
        }

        text += `\n=========================\n*📊 RINGKASAN KEUANGAN*\n📦 Total Barang: ${stats.totalItems} pcs\n💰 Potensi Omzet: ${formatRupiah(stats.totalValue)}\n-------------------------\n💵 Uang Masuk: ${formatRupiah(stats.totalReceived)}\n${stats.gap > 0 ? `⚠️ *Belum Tertagih: ${formatRupiah(stats.gap)}*\n` : '✨ *STATUS: LUNAS SEMUA* ✨\n'}`;

        navigator.clipboard.writeText(text).then(() => alert("Laporan berhasil disalin!")).catch(() => alert("Gagal menyalin teks."));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberRef.current && !memberRef.current.contains(event.target as Node)) setIsMemberDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto calculate actual price when payment is checked
    useEffect(() => {
        if (dataUpload.isPayment && dataUpload.totalOrder && dataUpload.category.price) {
            if (dataUpload.actualPrice === "" || dataUpload.actualPrice === "0") {
                const total = parseInt(dataUpload.totalOrder) * parseInt(dataUpload.category.price);
                if (!isNaN(total)) setDataUpload(prev => ({ ...prev, actualPrice: String(total) }));
            }
        }
    }, [dataUpload.isPayment, dataUpload.totalOrder, dataUpload.category.price, dataUpload.actualPrice]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <OrderHeader
                categoryLabel={settingFilter.category.label}
                dataCount={filteredOrder.length}
                isAuthenticated={isAuthenticated}
                onLockSession={handleLockSession}
                onCopyReport={copyReport}
                onOpenFilter={() => setModalFilter(true)}
                onAddOrder={() => handleAction('create')}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

                {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>}
                {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 flex items-center gap-3"><AlertCircle /> {error}</div>}

                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredOrder.length > 0 ? filteredOrder.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onEdit={(ord) => handleAction('edit', ord)}
                                onDelete={(id) => handleAction('delete', id)}
                                onPay={(ord) => {
                                    setPaymentDetail({ id: ord.id, price: ord.unit_price * ord.total_order });
                                    setModalPayment(true);
                                }}
                                formatRupiah={formatRupiah}
                            />
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

            <button
                onClick={() => setModalSummary(true)}
                className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-full font-bold shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all z-40"
            >
                <TrendingUp size={20} />
                <span className="hidden sm:inline">Lihat Ringkasan</span>
            </button>

            {/* Modals */}
            {modalSummary && <OrderSummaryModal stats={stats} onClose={() => setModalSummary(false)} />}

            <OrderFormModal
                isOpen={modalCreate}
                isUpdate={modalUpdate}
                dataUpload={dataUpload}
                setDataUpload={setDataUpload}
                memberSearch={memberSearch}
                setMemberSearch={setMemberSearch}
                isMemberDropdownOpen={isMemberDropdownOpen}
                setIsMemberDropdownOpen={setIsMemberDropdownOpen}
                filteredMembers={filteredMembers}
                dataDropdownCategory={dataDropdownCategory}
                onSave={handleSaveOrder}
                onClose={() => { setModalCreate(false); resetForm(); }}
                uploading={uploading}
                memberRef={memberRef}
            />

            <PaymentModal
                isOpen={modalPayment}
                onClose={() => setModalPayment(false)}
                onConfirm={handleQuickPay}
                price={paymentDetail.price}
                actualPricePay={actualPricePay}
                setActualPricePay={setActualPricePay}
                isExactChange={isExactChange}
                setIsExactChange={setIsExactChange}
                uploading={uploading}
            />

            <OrderFilterModal
                isOpen={modalFilter}
                onClose={() => setModalFilter(false)}
                categoryLabel={settingFilter.category.label}
                onCategoryChange={(label, id) => setSettingFilter({ ...settingFilter, category: { label, value: label, id: id || "", name: label, price: "0" } })}
                dataDropdownCategory={dataDropdownCategory}
                isPayment={settingFilter.isPayment}
                onPaymentStatusChange={(status) => setSettingFilter({ ...settingFilter, isPayment: status })}
                onReset={() => {
                    setSettingFilter({
                        category: { label: 'Semua Kategori', value: "", id: "", name: "", price: "" },
                        isPayment: null
                    });
                    setModalFilter(false);
                }}
                onApply={() => setModalFilter(false)}
            />

            <PasswordDialog
                isOpen={openPasswordDialog}
                onClose={() => setOpenPasswordDialog(false)}
                onConfirm={handlePasswordSubmit}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                loadingPassword={loadingPassword}
            />

            <ConfirmDeleteModal
                isOpen={modalDelete}
                onClose={() => setModalDelete(false)}
                onConfirm={handleDelete}
                uploading={uploading}
            />
        </div>
    );
};

export default OrderListPage;