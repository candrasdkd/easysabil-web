import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [needsManualInstall, setNeedsManualInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafariBrowser = /safari/.test(userAgent) && !/chrome|chromium|crios|edg/.test(userAgent);

        setIsIOS(isIOSDevice);
        setNeedsManualInstall(isIOSDevice || isSafariBrowser);

        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || navigatorWithStandalone.standalone === true;
        if (isStandalone) {
            setIsVisible(false);
        }

        // For Apple devices (iOS/Safari), we show it manually since beforeinstallprompt doesn't fire
        if ((isIOSDevice || isSafariBrowser) && !isStandalone) {
            const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!hasDismissed) {
                setIsVisible(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt && !needsManualInstall) return;

        if (needsManualInstall) {
            setShowManualGuide(true);
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setIsVisible(false);
            }
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible && !showManualGuide) return null;

    return (
        <>
            {isVisible && (
                <div className="fixed bottom-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-700/50 backdrop-blur-md bg-opacity-90">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-800 p-2 rounded-xl">
                                <Download className="w-6 h-6 text-emerald-100" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Install EasySabil</p>
                                <p className="text-xs text-emerald-200">Gunakan aplikasi lebih cepat & offline</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleInstallClick}
                                className="bg-white text-emerald-900 px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                            >
                                Install
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-2 text-emerald-300 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Guide Modal for iOS / Safari */}
            {showManualGuide && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-800 space-y-4 animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900">
                                Cara Install di {isIOS ? 'iOS (iPhone/iPad)' : 'Safari'}
                            </h3>
                            <button
                                onClick={() => setShowManualGuide(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <ol className="text-sm space-y-3 text-slate-600">
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mt-0.5">1</span>
                                <span>Ketuk tombol <strong>Bagikan / Share</strong> {isIOS ? '(ikon kotak dengan panah ke atas di bilah navigasi Safari)' : 'di menu browser'}.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mt-0.5">2</span>
                                <span>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama"</strong> (Add to Home Screen).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mt-0.5">3</span>
                                <span>Ketuk <strong>Tambah</strong> di sudut kanan atas. Ikon EasySabil akan muncul di layar utama Anda.</span>
                            </li>
                        </ol>
                        <button
                            onClick={() => setShowManualGuide(false)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-200 active:scale-95"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
