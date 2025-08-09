import { useParams } from 'react-router';
import PageContainer from './PageContainer';
import React from 'react';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function MemberEdit() {
    const { id } = useParams();
    const notifications = useNotifications();
    const [showForm, setShowForm] = React.useState(false);
    const [passwordInput, setPasswordInput] = React.useState('');
    const [openPasswordModal, setOpenPasswordModal] = React.useState(true);
    const [loadingPassword, setLoadingPassword] = React.useState(false);

    const handlePasswordSubmit = () => {
        if (!passwordInput.trim()) {
            notifications.show('Password tidak boleh kosong', { severity: 'warning' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (passwordInput === "admin354") {
                setShowForm(true);
                setOpenPasswordModal(false);
            } else {
                notifications.show('Password salah', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
            }
            setLoadingPassword(false);
        }, 800); // delay kecil untuk efek loading
    };
    return (
        <PageContainer
            title={`Edit Member ${id}`}
            breadcrumbs={[
                { title: 'Members', path: '/members' },
                { title: `Member ${id}`, path: `/members/${id}` },
                { title: 'Edit' },
            ]}
        >

            {showForm && <></>}
            {/* Modal password */}
            <Dialog open={openPasswordModal} disableEscapeKeyDown fullWidth maxWidth="xs">
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LockIcon color="primary" />
                        Masukkan Password
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Untuk melanjutkan Edit anggota baru, silakan masukkan password keamanan.
                    </Typography>
                    <TextField
                        fullWidth
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                </DialogContent>
                <DialogActions sx={{ display: 'flex', gap: 1, px: 3, pb: 2 }}>
                    <Button
                        onClick={() => window.history.back()}
                        variant="outlined"
                        color="inherit"
                        fullWidth
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePasswordSubmit}
                        variant="contained"
                        color="primary"
                        disabled={loadingPassword}
                        fullWidth
                        startIcon={loadingPassword ? <CircularProgress size={18} /> : null}
                    >
                        {loadingPassword ? 'Memeriksa...' : 'Masuk'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* <Box sx={{ display: 'flex', flex: 1 }}>{renderEdit}</Box> */}
        </PageContainer>
    );
}