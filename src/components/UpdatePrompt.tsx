import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh],
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
                <div className="w-16 h-16 bg-blue-50 flex items-center justify-center rounded-2xl mb-5 shadow-inner">
                    <RefreshCw size={28} className="text-blue-600 animate-spin" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-800 mb-2">Update Tersedia! 🎉</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    Versi terbaru EasySabil telah siap. Anda wajib memperbarui aplikasi untuk melanjutkan dan menikmati fitur terbaru.
                </p>
                <button
                    onClick={() => updateServiceWorker(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-200 active:scale-95 transition-all outline-none"
                >
                    Perbarui Sekarang
                </button>
            </div>
        </div>
    );
}
