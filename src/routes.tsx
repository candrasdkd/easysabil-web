import { lazy, Suspense, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { readBooleanPreference, writePreference } from './lib/storage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FamiliesPage = lazy(() => import('./pages/FamiliesPage'));
const MemberListPage = lazy(() => import('./pages/MemberListPage'));
const MemberCreatePage = lazy(() => import('./pages/MemberCreatePage'));
const MemberEditPage = lazy(() => import('./pages/MemberEditPage'));
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage'));
const CategoryOrdersPage = lazy(() => import('./pages/CategoryOrdersPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CensusSummaryPage = lazy(() => import('./pages/CensusSummaryPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

const AUTH_PATHS = new Set(['/login', '/register', '/lupa-password']);
const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed';

function RouteLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
    );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}

function AdminPage({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}

export default function AppRoutes() {
    const location = useLocation();
    const isAuthPage = AUTH_PATHS.has(location.pathname);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        readBooleanPreference(SIDEBAR_STORAGE_KEY),
    );

    const handleToggleSidebar = () => {
        setSidebarCollapsed((currentValue) => {
            const nextValue = !currentValue;
            writePreference(SIDEBAR_STORAGE_KEY, String(nextValue));
            return nextValue;
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

            <main
                className={`transition-all duration-300 ease-in-out ${
                    isAuthPage ? '' : sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
                }`}
            >
                {!isAuthPage && <div className="h-14 md:hidden" />}

                <Suspense fallback={<RouteLoading />}>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/lupa-password" element={<ForgotPasswordPage />} />

                        <Route path="/admin/users" element={<AdminPage><AdminUsersPage /></AdminPage>} />
                        <Route path="/audit-log" element={<AdminPage><AuditLogPage /></AdminPage>} />

                        <Route path="/" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
                        <Route path="/profile" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
                        <Route path="/families" element={<ProtectedPage><FamiliesPage /></ProtectedPage>} />
                        <Route path="/members" element={<ProtectedPage><MemberListPage /></ProtectedPage>} />
                        <Route path="/members/new" element={<ProtectedPage><MemberCreatePage /></ProtectedPage>} />
                        <Route path="/members/:id/edit" element={<ProtectedPage><MemberEditPage /></ProtectedPage>} />
                        <Route path="/members/:id" element={<ProtectedPage><MemberDetailPage /></ProtectedPage>} />
                        <Route path="/category-orders" element={<ProtectedPage><CategoryOrdersPage /></ProtectedPage>} />
                        <Route path="/category-orders/list" element={<ProtectedPage><OrdersPage /></ProtectedPage>} />
                        <Route path="/rekap" element={<ProtectedPage><CensusSummaryPage /></ProtectedPage>} />
                        <Route path="/attendance" element={<ProtectedPage><AttendancePage /></ProtectedPage>} />
                    </Routes>
                </Suspense>
            </main>
        </div>
    );
}
