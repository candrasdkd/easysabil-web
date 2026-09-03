import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900">{title}</h3>
                        <p className="text-slate-500 text-sm">{description}</p>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} disabled={uploading} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all disabled:opacity-50">Batal</button>
                    <button
                        disabled={uploading}
                        onClick={onConfirm}
                        className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all disabled:opacity-50"
                    >
                        {uploading ? "Menghapus..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
