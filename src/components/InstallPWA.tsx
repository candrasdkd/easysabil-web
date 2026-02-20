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
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
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
            if (isIOS) {
                alert('Untuk install: tap icon Share (kotak dengan panah ke atas) di bawah layar, lalu pilih "Add to Home Screen" / "Tambah ke Layar Utama"');
            } else {
                alert('Untuk install: klik icon Share di pojok kanan atas browser Safari, lalu pilih "Add to Dock..."');
            }
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

    if (!isVisible) return null;

    return (
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
    );
}
