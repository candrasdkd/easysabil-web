import { Navigate, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { type ReactNode } from "react";
import { MessageCircle, LogOut } from "lucide-react";

// Admin WhatsApp number
const ADMIN_WA_NUMBER = "6285156775933"; // Ganti dengan nomor WhatsApp admin
const ADMIN_WA_MESSAGE = encodeURIComponent("Halo Admin, saya ingin mengaktifkan akun saya di EasySabil.");

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: { children: ReactNode, adminOnly?: boolean, superAdminOnly?: boolean }) {
    const { user, profile, loading, signOut } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-slate-600 text-sm font-medium">Memuat...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If not active, show "pending" screen — user stays logged in but can't do anything
    if (profile && !profile.isActive) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Akun Belum Diaktifkan</h2>
                    <p className="text-gray-500 text-sm mb-6">
                        Akun Anda sudah terdaftar, namun belum diaktifkan oleh admin. Harap hubungi admin untuk aktivasi.
                    </p>
                    <a
                        href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${ADMIN_WA_MESSAGE}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors mb-3"
                    >
                        <MessageCircle size={18} />
                        Hubungi Admin via WhatsApp
                    </a>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-colors"
                    >
                        <LogOut size={18} />
                        Keluar
                    </button>
                </div>
            </div>
        );
    }

    // Super Admin only routes (status === 0)
    if (superAdminOnly && profile && profile.status !== 0) {
        return <Navigate to="/" replace />;
    }

    // Admin only routes (status === 0 or 1)
    if (adminOnly && profile && profile.status > 1) {
        return <Navigate to="/" replace />;
    }

    return children;
}
