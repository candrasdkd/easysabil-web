import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import {
    ClipboardList,
    Search,
    Filter,
    Loader2,
    ChevronDown,
    RefreshCw,
} from 'lucide-react';

import type { AuditLogEntry } from '../utils/auditLogger';
import { STATUS_LABELS } from '../contexts/AuthContext';

dayjs.locale('id');

const ACTIONS: { value: string; label: string; color: string }[] = [
    { value: '', label: 'Semua Aktivitas', color: 'slate' },
    { value: 'CREATE', label: 'Tambah Data', color: 'emerald' },
    { value: 'UPDATE', label: 'Ubah Data', color: 'blue' },
    { value: 'DELETE', label: 'Hapus Data', color: 'rose' },
];

export default function AuditLog() {
    const [logs, setLogs] = useState<(AuditLogEntry & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState<any>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState<string>('');

    const LOGS_PER_PAGE = 50;

    const fetchLogs = async (isLoadMore = false) => {
        if (!isLoadMore) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let q = query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc'),
                limit(LOGS_PER_PAGE)
            );

            // Apply filters - note Firestore limitations with multiple inequality/orderBy
            // We handle search filter client-side for simplicity if it's text search
            const constraints = [];

            if (selectedAction) {
                constraints.push(where('action', '==', selectedAction));
            }

            if (constraints.length > 0) {
                q = query(
                    collection(db, 'audit_logs'),
                    ...constraints,
                    orderBy('timestamp', 'desc'),
                    limit(LOGS_PER_PAGE)
                );
            }

            if (isLoadMore && lastVisible) {
                q = query(q, startAfter(lastVisible));
            }

            const querySnapshot = await getDocs(q);

            const newLogs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as (AuditLogEntry & { id: string })[];

            if (isLoadMore) {
                setLogs(prev => [...prev, ...newLogs]);
            } else {
                setLogs(newLogs);
            }

            if (querySnapshot.docs.length > 0) {
                setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
                setHasMore(querySnapshot.docs.length === LOGS_PER_PAGE);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAction]); // Refetch when action filter changes

    // Client-side search for entity_name, actor_email, details
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return logs;

        const q = searchQuery.toLowerCase();
        return logs.filter(log =>
            log.entity_name?.toLowerCase().includes(q) ||
            log.actor_email?.toLowerCase().includes(q) ||
            log.details?.toLowerCase().includes(q)
        );
    }, [logs, searchQuery]);

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATE': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">TAMBAH</span>;
            case 'UPDATE': return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">UBAH</span>;
            case 'DELETE': return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">HAPUS</span>;
            default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200">{action}</span>;
        }
    };

    const formatChanges = (changesStr?: string) => {
        if (!changesStr) return null;
        try {
            const changes = JSON.parse(changesStr);
            const keys = Object.keys(changes);
            if (keys.length === 0) return null;

            return (
                <div className="mt-2 text-xs bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                    {keys.map(key => {
                        const oldVal = changes[key].old;
                        const newVal = changes[key].new;
                        // Skip if both are empty or null
                        if ((oldVal === null || oldVal === '') && (newVal === null || newVal === '')) return null;

                        return (
                            <div key={key} className="grid grid-cols-[100px_1fr] md:grid-cols-[120px_1fr] gap-2">
                                <span className="font-semibold text-slate-500">{key}:</span>
                                <span className="truncate" title={`${oldVal || '(kosong)'} ➔ ${newVal || '(kosong)'}`}>
                                    <span className="line-through text-rose-400 mr-1">{String(oldVal || '(kosong)')}</span>
                                    <span className="text-emerald-600 font-medium">➔ {String(newVal || '(kosong)')}</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        } catch (e) {
            return <div className="mt-2 text-xs text-slate-500">{changesStr}</div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardList className="text-blue-600" />
                        Audit Log
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Riwayat aktivitas dan perubahan data sistem.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => fetchLogs()}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm flex items-center gap-2"
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={loading && !loadingMore ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline text-sm font-medium">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Cari user, aktivitas, dll..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="w-full md:w-auto pl-10 pr-10 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-100 outline-none appearance-none"
                        >
                            {ACTIONS.map(action => (
                                <option key={action.value} value={action.value}>{action.label}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* Content Table / List */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {loading && !loadingMore ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-blue-600" size={40} />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="bg-slate-50 inline-block p-6 rounded-full mb-4">
                            <ClipboardList size={48} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Tidak ada riwayat.</h3>
                        <p className="text-slate-500">Belum ada aktivitas yang tercatat atau data tidak sesuai filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="px-6 py-4 w-40">Waktu</th>
                                    <th className="px-6 py-4 w-32">Aksi</th>
                                    <th className="px-6 py-4 w-48">Pengguna</th>
                                    <th className="px-6 py-4 text-left">Detail Aktivitas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-800">
                                                {log.timestamp ? dayjs(log.timestamp.toDate()).format('DD MMM YYYY') : '-'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {log.timestamp ? dayjs(log.timestamp.toDate()).format('HH:mm') : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800 truncate max-w-[150px]" title={log.actor_email}>
                                                {log.actor_email.split('@')[0]}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                                                Status: {STATUS_LABELS[log.actor_status] || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">
                                                {log.details || `${log.action} ${log.entity} - ${log.entity_name}`}
                                            </div>
                                            {log.action === 'UPDATE' && formatChanges(log.changes)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {hasMore && filteredLogs.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                        <button
                            onClick={() => fetchLogs(true)}
                            disabled={loadingMore}
                            className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm"
                        >
                            {loadingMore && <Loader2 size={16} className="animate-spin" />}
                            Muat Lebih Banyak
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
