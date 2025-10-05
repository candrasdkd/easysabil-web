import { Routes, Route } from 'react-router';
import DashboardPage from './pages/DashboardPage';
import MemberListPage from './pages/MemberListPage';
import MemberCreatePage from './pages/MemberCreatePage';
import MemberEditPage from './pages/MemberEditPage';
import MemberDetailPage from './pages/MemberDetailPage';
import Navbar from './components/Navbar';
import CategoryOrder from './components/CategoryOrder';
import { Box, Toolbar } from '@mui/material';
import RekapSensusScreen from "./components/totalSensusDesa";
export default function AppRoutes() {
    return (
        <>
            <Navbar />
            <Box sx={{ p: 3 }}>
                <Toolbar />
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/members" element={<MemberListPage />} />
                    <Route path="/members/new" element={<MemberCreatePage />} />
                    <Route path="/members/:id/edit" element={<MemberEditPage />} />
                    <Route path="/members/:id" element={<MemberDetailPage />} />
                    <Route path="/category-orders" element={<CategoryOrder />} />
                    <Route path="/rekap" element={<RekapSensusScreen />} />
                    {/* Tambahkan rute lainnya sesuai kebutuhan */}
                    {/* atau komponen MemberList langsung di sini */}
                </Routes>
            </Box>
        </>
    )
}
