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
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if it's iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

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
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        // For iOS, we can show it manually since beforeinstallprompt doesn't fire
        if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
            const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!hasDismissed) {
                setIsVisible(true);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt && !isIOS) return;

        if (isIOS) {
            alert('To install: tap the share icon (square with arrow up) and select "Add to Home Screen"');
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
