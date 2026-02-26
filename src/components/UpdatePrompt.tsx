import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            // Polling setiap 60 detik untuk cek update baru
            if (r) {
                setInterval(() => r.update(), 60 * 1000);
            }
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[200] flex justify-center">
            <div className="w-full max-w-sm bg-blue-700 text-white px-4 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-500/50">
                <div className="bg-blue-600 p-2 rounded-xl shrink-0">
                    <RefreshCw size={18} className="text-blue-100" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">Update tersedia! 🎉</p>
                    <p className="text-xs text-blue-200 mt-0.5">Versi baru EasySabil siap digunakan.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform hover:bg-blue-50"
                    >
                        Perbarui
                    </button>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="p-1 text-blue-300 hover:text-white transition-colors"
                        title="Tutup"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
