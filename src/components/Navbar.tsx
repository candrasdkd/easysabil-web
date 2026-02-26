import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    Menu,
    X,
    ChevronRight,
    Globe,
    LogOut,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const baseNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Sensus', path: '/members', icon: Users },
    { label: 'Keluarga', path: '/families', icon: Users },
    // { label: 'Absensi', path: '/attendance', icon: Globe },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();

    // Dynamically build nav items based on user role
    const canSeeOrders =
        profile?.status === 0 ||
        profile?.status === 1 ||
        (profile?.status === 3 && profile?.kelompok === 'Kelompok 1');

    const navItems = [...baseNavItems];
    if (canSeeOrders) {
        navItems.splice(3, 0, { label: 'Pemesanan', path: '/category-orders', icon: ShoppingCart });
    }
    // Rekap & Users: hanya Super Admin dan Admin
    if (profile?.status === 0 || profile?.status === 1) {
        navItems.push({ label: 'Rekap', path: '/rekap', icon: FileText });
        navItems.push({ label: 'Users', path: '/admin/users', icon: ShieldCheck });
    }

    // --- LOGIKA BARU UNTUK CEK ACTIVE ---
    const isActiveLink = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    // Hide navbar on auth pages
    const authPages = ['/login', '/register'];
    if (authPages.includes(location.pathname)) return null;

    // If user is not authenticated or not an active user, we can hide standard links or show simplified navbar
    // Alternatively, ProtectedRoute handles redirecting, but let's just show minimal navbar for logged out
    if (!user) {
        return (
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md">
                                <Globe size={20} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800">
                                Easy<span className="text-blue-600">Sabil</span>
                            </span>
                        </div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <>
            <nav
                className={`
                    fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300
                    ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-white border-b border-transparent'}
                `}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">

                        {/* 1. BRAND */}
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md">
                                <Globe size={20} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800">
                                Easy<span className="text-blue-600">Sabil</span>
                            </span>
                        </div>

                        {/* 2. DESKTOP NAVIGATION */}
                        {profile?.isActive && (
                            <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/60">
                                {navItems.map((item) => {
                                    const active = isActiveLink(item.path);
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={`
                                                flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                                                ${active
                                                    ? 'bg-white text-blue-700 shadow-sm border border-slate-100'
                                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}
                                            `}
                                        >
                                            <item.icon
                                                size={16}
                                                className={active ? "text-blue-600 fill-blue-100" : ""}
                                            />
                                            {item.label}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3. RIGHT SIDE */}
                        <div className="flex items-center gap-2">
                            {/* Profile avatar button */}
                            <button
                                onClick={() => navigate('/profile')}
                                title={profile?.email ?? 'Profil'}
                                className="hidden md:flex w-9 h-9 items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-sm transition-colors border border-blue-200"
                            >
                                {profile?.email?.[0]?.toUpperCase() ?? '?'}
                            </button>

                            <div className="hidden md:block">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <LogOut size={16} /> Keluar
                                </button>
                            </div>
                            <button
                                onClick={() => setIsOpen(true)}
                                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
                            >
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- MOBILE DRAWER --- */}
            <div
                className={`
                    fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 md:hidden
                    ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
                `}
                onClick={() => setIsOpen(false)}
            />

            <div
                className={`
                    fixed inset-y-0 right-0 z-[70] w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <span className="font-bold text-lg text-slate-800">Menu Utama</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
                    {profile?.isActive && navItems.map((item) => {
                        const active = isActiveLink(item.path);

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all group
                                    ${active
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={active ? "text-blue-600" : "opacity-75"} />
                                    {item.label}
                                </div>
                                {active && <ChevronRight size={16} className="text-blue-400" />}
                            </NavLink>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm"
                    >
                        <LogOut size={16} /> Keluar
                    </button>
                    <p className="text-xs font-medium text-slate-500 mt-4 text-center">
                        &copy; {new Date().getFullYear()} EasySabil
                    </p>
                </div>
            </div>

            <div className="h-16" />
        </>
    );
}