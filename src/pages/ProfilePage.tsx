import { useAuth } from '../contexts/AuthContext';
import { STATUS_LABELS } from './AdminUsersPage';
import { User, Mail, Shield, Users, CheckCircle, XCircle } from 'lucide-react';

export default function ProfilePage() {
    const { profile } = useAuth();

    if (!profile) return null;

    const statusLabel = STATUS_LABELS[profile.status] ?? 'Unknown';
    const statusColor = profile.status <= 1 ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';

    const fields = [
        {
            icon: <Mail size={18} className="text-slate-400" />,
            label: 'Email',
            value: profile.email,
        },
        {
            icon: <Shield size={18} className="text-slate-400" />,
            label: 'Role',
            value: (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusLabel}
                </span>
            ),
        },
        {
            icon: <Users size={18} className="text-slate-400" />,
            label: 'Kelompok',
            value: profile.kelompok ?? '-',
        },
        {
            icon: profile.isActive
                ? <CheckCircle size={18} className="text-green-500" />
                : <XCircle size={18} className="text-red-400" />,
            label: 'Status Akun',
            value: profile.isActive
                ? <span className="text-green-600 font-medium">Aktif</span>
                : <span className="text-red-500 font-medium">Menunggu Aktivasi</span>,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-10 px-4">
            <div className="w-full max-w-lg animate-fade-up">
                {/* Header Card */}
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-8 text-center relative overflow-hidden mb-6 shadow-xl shadow-indigo-200">
                    <div className="absolute top-[-40px] right-[-40px] w-40 h-40 bg-white/5 rounded-full animate-float-a" />
                    <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 bg-white/5 rounded-full animate-float-b" />

                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-lg">
                            <User size={36} className="text-white" />
                        </div>
                        <p className="text-indigo-200 text-sm font-medium">{statusLabel}</p>
                        <h1 className="text-xl font-bold text-white mt-1 break-all">{profile.email}</h1>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                    {fields.map((field) => (
                        <div key={field.label} className="flex items-center gap-4 px-6 py-4">
                            <div className="flex-shrink-0">{field.icon}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{field.label}</p>
                                <div className="text-sm font-medium text-slate-800 mt-0.5 truncate">{field.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    Untuk mengubah data akun, hubungi Super Admin.
                </p>
            </div>
        </div>
    );
}
