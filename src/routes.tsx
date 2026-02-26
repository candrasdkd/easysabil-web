import { Routes, Route } from 'react-router';
import DashboardPage from './pages/DashboardPage';
import MemberListPage from './pages/MemberListPage';
import MemberCreatePage from './pages/MemberCreatePage';
import MemberEditPage from './pages/MemberEditPage';
import MemberDetailPage from './pages/MemberDetailPage';
import Navbar from './components/Navbar';
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

export default function AppRoutes() {
    return (
        <>
            <Navbar />
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
                {/* Tambahkan rute lainnya sesuai kebutuhan */}
            </Routes>
        </>
    )
}
