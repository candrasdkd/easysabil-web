import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    ClipboardList,
    Menu,
    X,
    ChevronRight,
    Globe,
    LogOut,
    ShieldCheck,
    UserCircle,
    Home,
    AlertTriangle,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const baseNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Sensus', path: '/members', icon: Users },
    { label: 'Keluarga', path: '/families', icon: Home },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();

    // Auto-close mobile drawer on navigation
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    const canSeeOrders =
        profile?.status === 0 ||
        profile?.status === 1 ||
        (profile?.status === 3 && profile?.kelompok === 'Kelompok 1');

    const navItems = [...baseNavItems];
    if (canSeeOrders) {
        navItems.splice(3, 0, { label: 'Pemesanan', path: '/category-orders', icon: ShoppingCart });
    }
    if (profile?.status === 0 || profile?.status === 1) {
        navItems.push({ label: 'Rekap', path: '/rekap', icon: FileText });
        navItems.push({ label: 'Audit Log', path: '/audit-log', icon: ClipboardList });
        navItems.push({ label: 'Users', path: '/admin/users', icon: ShieldCheck });
    }

    const isActiveLink = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        setShowLogoutModal(false);
        await signOut();
        navigate('/login');
    };

    const authPages = ['/login', '/register', '/lupa-password'];
    if (authPages.includes(location.pathname)) return null;

    if (!user) {
        return (
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex items-center h-full gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md">
                            <Globe size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-800">
                            Easy<span className="text-blue-600">Sabil</span>
                        </span>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <>
            {/* ──────────────────────────────── DESKTOP SIDEBAR ──────────────────────────────── */}
            <aside
                className={`
                    hidden md:flex fixed inset-y-0 left-0 z-50 flex-col bg-white border-r border-slate-200 shadow-sm
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'w-16' : 'w-64'}
                `}
            >
                {/* Brand + Toggle */}
                <div className={`flex items-center border-b border-slate-100 h-14 shrink-0 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
                    {!collapsed && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md shrink-0">
                            <Globe size={17} />
                        </div>
                    )}
                    {!collapsed && (
                        <span className="font-bold text-lg tracking-tight text-slate-800 flex-1 truncate">
                            Easy<span className="text-blue-600">Sabil</span>
                        </span>
                    )}
                    <button
                        onClick={onToggle}
                        title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
                        className={`
                            p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0
                            ${collapsed ? '' : 'ml-auto'}
                        `}
                    >
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
                    {profile?.isActive && navItems.map((item) => {
                        const active = isActiveLink(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : undefined}
                                className={`
                                    flex items-center rounded-xl text-sm font-medium transition-all group
                                    ${collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'}
                                    ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                                    <item.icon
                                        size={18}
                                        className={active ? 'text-blue-600' : 'opacity-60 group-hover:opacity-100'}
                                    />
                                    {!collapsed && item.label}
                                </div>
                                {!collapsed && active && <ChevronRight size={15} className="text-blue-400" />}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer: Profile + Logout */}
                <div className={`border-t border-slate-100 py-2 px-2 space-y-1`}>
                    <button
                        onClick={() => navigate('/profile')}
                        title={collapsed ? (profile?.email ?? 'Profil') : undefined}
                        className={`
                            w-full flex items-center rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all group
                            ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                        `}
                    >
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200 shrink-0">
                            {profile?.email?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        {!collapsed && (
                            <>
                                <span className="truncate flex-1">{profile?.email ?? 'Profil'}</span>
                                <UserCircle size={15} className="opacity-40 group-hover:opacity-70 shrink-0" />
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        title={collapsed ? 'Keluar' : undefined}
                        className={`
                            w-full flex items-center rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all
                            ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'}
                        `}
                    >
                        <LogOut size={16} />
                        {!collapsed && 'Keluar'}
                    </button>
                    {!collapsed && (
                        <p className="text-xs text-slate-400 text-center pt-1 pb-0.5">
                            © {new Date().getFullYear()} EasySabil
                        </p>
                    )}
                </div>
            </aside>

            {/* ──────────────────────────────── MOBILE TOPBAR ──────────────────────────────── */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-sm shrink-0">
                        <Globe size={17} />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-800">
                        Easy<span className="text-blue-600">Sabil</span>
                    </span>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <Menu size={22} />
                </button>
            </header>

            {/* ──────────────────────────────── MOBILE DRAWER ──────────────────────────────── */}
            <div
                className={`
                    fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 md:hidden
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setIsOpen(false)}
            />

            <div
                className={`
                    fixed inset-y-0 left-0 z-[70] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-blue-200 shadow-sm shrink-0">
                            <Globe size={17} />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-800">
                            Easy<span className="text-blue-600">Sabil</span>
                        </span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {profile?.isActive && navItems.map((item) => {
                        const active = isActiveLink(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group
                                    ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={active ? 'text-blue-600' : 'opacity-60'} />
                                    {item.label}
                                </div>
                                {active && <ChevronRight size={16} className="text-blue-400" />}
                            </NavLink>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100 space-y-2">
                    <button
                        onClick={() => { navigate('/profile'); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200 shrink-0">
                            {profile?.email?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="truncate">{profile?.email ?? 'Profil'}</span>
                        <UserCircle size={16} className="ml-auto opacity-40" />
                    </button>
                    <button
                        onClick={() => { setIsOpen(false); setShowLogoutModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-all"
                    >
                        <LogOut size={16} />
                        Keluar
                    </button>
                    <p className="text-xs font-medium text-slate-400 text-center pt-1">
                        © {new Date().getFullYear()} EasySabil
                    </p>
                </div>
            </div>

            {/* ──────────────────────────────── LOGOUT MODAL ──────────────────────────────── */}
            <div
                className={`
                    fixed inset-0 z-[100] flex items-center justify-center px-4 transition-all duration-200
                    ${showLogoutModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
            >
                <div
                    className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                    onClick={() => setShowLogoutModal(false)}
                />
                <div
                    className={`
                        relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transition-all duration-200
                        ${showLogoutModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
                    `}
                >
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Konfirmasi Keluar</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Apakah kamu yakin ingin keluar dari akun ini?
                        </p>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setShowLogoutModal(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                        >
                            Ya, Keluar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
