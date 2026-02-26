import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import DashboardPage from './pages/DashboardPage';
import MemberListPage from './pages/MemberListPage';
import MemberCreatePage from './pages/MemberCreatePage';
import MemberEditPage from './pages/MemberEditPage';
import MemberDetailPage from './pages/MemberDetailPage';
import Sidebar from './components/Sidebar';
import CategoryOrder from './components/CategoryOrder';
import TabelSensusScreen from "./components/TableTotalSensus";
import OrderListPage from './components/ListOrder';
import MonthlyAttendance from './components/AttendanceLog';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminUsersPage from './pages/AdminUsersPage';
import ProfilePage from './pages/ProfilePage';
import FamiliesPage from './pages/FamiliesPage';

const authPages = ['/login', '/register'];

export default function AppRoutes() {
    const location = useLocation();
    const isAuthPage = authPages.includes(location.pathname);

    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        } catch {
            return false;
        }
    });

    const handleToggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebarCollapsed', String(next)); } catch { }
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

            {/* Main content: on desktop offset by sidebar width, on mobile no left margin */}
            <main
                className={`transition-all duration-300 ease-in-out ${isAuthPage ? '' : sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
                    }`}
            >
                {/* Mobile-only top padding for the fixed topbar */}
                {!isAuthPage && <div className="h-14 md:hidden" />}

                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Admin/Super Admin Route */}
                    <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUsersPage /></ProtectedRoute>} />

                    {/* Protected Routes */}
                    <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/families" element={<ProtectedRoute><FamiliesPage /></ProtectedRoute>} />
                    <Route path="/members" element={<ProtectedRoute><MemberListPage /></ProtectedRoute>} />
                    <Route path="/members/new" element={<ProtectedRoute><MemberCreatePage /></ProtectedRoute>} />
                    <Route path="/members/:id/edit" element={<ProtectedRoute><MemberEditPage /></ProtectedRoute>} />
                    <Route path="/members/:id" element={<ProtectedRoute><MemberDetailPage /></ProtectedRoute>} />
                    <Route path="/category-orders" element={<ProtectedRoute><CategoryOrder /></ProtectedRoute>} />
                    <Route path="/category-orders/list" element={<ProtectedRoute><OrderListPage /></ProtectedRoute>} />
                    <Route path="/rekap" element={<ProtectedRoute><TabelSensusScreen /></ProtectedRoute>} />
                    <Route path='/attendance' element={<ProtectedRoute><MonthlyAttendance /></ProtectedRoute>} />
                </Routes>
            </main>
        </div>
    );
}
