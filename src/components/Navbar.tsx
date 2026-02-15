import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router'; 
import { 
    LayoutDashboard, 
    Users, 
    ShoppingCart, 
    FileText, 
    Menu, 
    X, 
    ChevronRight,
    Globe 
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Sensus', path: '/members', icon: Users },
    { label: 'Pemesanan', path: '/category-orders', icon: ShoppingCart },
    { label: 'Rekap', path: '/rekap', icon: FileText },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    // --- LOGIKA BARU UNTUK CEK ACTIVE ---
    // Fungsi ini mengecek apakah kita sedang berada di halaman tersebut atau anak halamannya
    const isActiveLink = (path: string) => {
        if (path === '/') {
            // Khusus dashboard harus sama persis, kalau tidak dia akan aktif terus
            return location.pathname === '/';
        }
        // Untuk menu lain, gunakan startsWith
        // Contoh: path '/members' akan aktif jika URL '/members/create' atau '/members/edit/123'
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
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-md">
                                <Globe size={20} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-800">
                                Easy<span className="text-indigo-600">Sabil</span>
                            </span>
                        </div>

                        {/* 2. DESKTOP NAVIGATION */}
                        <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/60">
                            {navItems.map((item) => {
                                // Panggil logika cek active kita
                                const active = isActiveLink(item.path);
                                
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        // Kita tidak lagi menggunakan ({isActive}) bawaan NavLink
                                        // Tapi menggunakan variabel 'active' yang kita buat sendiri
                                        className={`
                                            flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200
                                            ${active 
                                                ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' 
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'}
                                        `}
                                    >
                                        <item.icon 
                                            size={16} 
                                            className={active ? "text-indigo-600 fill-indigo-100" : ""} 
                                        />
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </div>

                        {/* 3. RIGHT SIDE */}
                        <div className="flex items-center gap-3">
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
                    {navItems.map((item) => {
                        // Terapkan logika yang sama untuk Mobile
                        const active = isActiveLink(item.path);

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all group
                                    ${active 
                                        ? 'bg-indigo-50 text-indigo-700' 
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={active ? "text-indigo-600" : "opacity-75"} />
                                    {item.label}
                                </div>
                                {active && <ChevronRight size={16} className="text-indigo-400" />}
                            </NavLink>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 text-center">
                    <p className="text-xs font-medium text-slate-500">
                        &copy; {new Date().getFullYear()} EasySabil
                    </p>
                </div>
            </div>
            <div className="h-16" />
        </>
    );
}