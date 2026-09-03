import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    uploading?: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    uploading = false,
    title = 'Hapus Data?',
    description = 'Aksi ini tidak dapat dibatalkan. Seluruh data ini akan dihapus permanen.',
    confirmLabel = 'Ya, Hapus'
}) => {
    // Tutup modal jika user menekan tombol Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !uploading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, uploading, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !uploading) onClose();
            }}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Header & Close Button */}
                <div className="relative pt-6 px-6 pb-2 text-center">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40"
                        title="Tutup"
                        type="button"
                    >
                        <X size={18} />
                    </button>

                    {/* Layered Danger Icon */}
                    <div className="mx-auto mb-3.5 w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm shadow-rose-100 ring-4 ring-rose-50/60">
                        <Trash2 size={24} className="stroke-[2.2]" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1.5">
                        {title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed px-1">
                        {description}
                    </p>
                </div>

                {/* Subtle Warning Badge */}
                <div className="mx-6 my-2.5 px-3 py-2 bg-amber-50/80 border border-amber-200/60 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
                    <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span>Data yang dihapus tidak dapat dipulihkan kembali.</span>
                </div>

                {/* Action Buttons */}
                <div className="p-6 pt-3 flex gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={onConfirm}
                        className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-rose-200 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Menghapus...</span>
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
