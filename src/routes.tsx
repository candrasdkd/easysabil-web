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
export default function AppRoutes() {
    return (
        <>
            <Navbar />
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/members" element={<MemberListPage />} />
                <Route path="/members/new" element={<MemberCreatePage />} />
                <Route path="/members/:id/edit" element={<MemberEditPage />} />
                <Route path="/members/:id" element={<MemberDetailPage />} />
                <Route path="/category-orders" element={<CategoryOrder />} />
                <Route path="/category-orders/list" element={<OrderListPage />} />
                <Route path="/rekap" element={<TabelSensusScreen />} />
                {/* Tambahkan rute lainnya sesuai kebutuhan */}
                {/* atau komponen MemberList langsung di sini */}
            </Routes>
        </>
    )
}
