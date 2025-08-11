import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router';
import dayjs from 'dayjs';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    getOne as getMember,
    type Member,
} from '../types/Member';
import PageContainer from './PageContainer';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../supabase/client';

export default function EmployeeShow() {
    const { id } = useParams();
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [member, setMember] = React.useState<Member | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const [openPasswordDialog, setOpenPasswordDialog] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [loadingPassword, setLoadingPassword] = React.useState(false);
    const [requiredPassword, setRequiredPassword] = React.useState<string | null>(null);
    const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const showData = await getMember(String(id));

            setMember(showData);
        } catch (showDataError) {
            setError(showDataError as Error);
        }
        setIsLoading(false);
    }, [id]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const verifyPasswordAndRun = (expectedPassword: string, action: () => void) => {
        setRequiredPassword(expectedPassword);
        setPendingAction(() => action);
        setPassword('');
        setOpenPasswordDialog(true);
    };

    const handleMemberEdit = React.useCallback(() => {
        navigate(`/members/${id}/edit`);
    }, [navigate, id]);

    const handleEmployeeDelete = React.useCallback(async () => {
        verifyPasswordAndRun("admin354", async () => {
            if (!member) {
                return;
            }

            const confirmed = await dialogs.confirm(
                `Kamu yakin ingin menghapus data ini?`,
                {
                    title: `Delete ${member.name}?`,
                    severity: 'error',
                    okText: 'Delete',
                    cancelText: 'Cancel',
                },
            );

            if (confirmed) {
                setIsLoading(true);
                try {
                    const { error, status } = await supabase
                        .from('list_sensus')
                        .delete()
                        .eq('uuid', member.uuid);
                    if (error) {
                        notifications.show(`Gagal menghapus data. Reason: ${(error as Error).message}`, {
                            severity: 'error',
                            autoHideDuration: 3000,
                        });
                        return;
                    }

                    if (status === 204) {
                        notifications.show('Berhasil menghapus data', { severity: 'success', autoHideDuration: 3000 });
                        window.history.back()
                    }
                } catch (deleteError) {
                    notifications.show(
                        `Gagal menghapus data. Reason:' ${(deleteError as Error).message}`,
                        {
                            severity: 'error',
                            autoHideDuration: 3000,
                        },
                    );
                }
                setIsLoading(false);
            }
        })
    }, [member, dialogs, id, navigate, notifications]);

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            notifications.show('Password tidak boleh kosong', { severity: 'warning' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (password === requiredPassword) {
                setOpenPasswordDialog(false);
                if (pendingAction) {
                    pendingAction();
                }
            } else {
                notifications.show('Password salah', {
                    severity: 'error',
                    autoHideDuration: 3000,
                });
            }
            setLoadingPassword(false);
        }, 800); // delay kecil untuk efek loading
    };

    const handleBack = React.useCallback(() => {
        navigate('/members');
    }, [navigate]);

    const renderShow = React.useMemo(() => {
        if (isLoading) {
            return (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        m: 1,
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }
        if (error) {
            return (
                <Box sx={{ flexGrow: 1 }}>
                    <Alert severity="error">{error.message}</Alert>
                </Box>
            );
        }

        return member ? (
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <Grid container spacing={2} sx={{ width: '100%' }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Nama Lengkap</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.name}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Jenjang</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.level}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Jenis Kelamin</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.gender}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Usia</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.age}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Tanggal Lahir</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {dayjs(member.date_of_birth).format('DD MMMM YYYY')}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Status Pernikahan</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.marriage_status}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Kelompok</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.kelompok}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Sambung Aktif?</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_active ? 'Iya' : 'Tidak'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Kategori Duafa?</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_duafa ? 'Iya' : 'Tidak'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Dalam Binaan?</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_educate ? 'Iya' : 'Tidak'}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Button
                        variant="contained"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={handleMemberEdit}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={handleEmployeeDelete}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>
            </Box>
        ) : null;
    }, [
        isLoading,
        error,
        member,
        handleBack,
        handleMemberEdit,
        handleEmployeeDelete,
    ]);

    const pageTitle = member?.family_name === 'Rantau' ? `Dari Perantauan` : `Dari Keluarga ${member ? member.family_name : ''}`;

    return (
        <PageContainer
            breadcrumbs={[
                { title: 'Members', path: '/members' },
                { title: pageTitle },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderShow}</Box>
            <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)} fullWidth maxWidth="xs">
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LockIcon color="primary" />
                        Masukkan Password
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        Untuk melanjutkan proses, silakan masukkan password keamanan.
                    </Typography>
                    <TextField
                        fullWidth
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                </DialogContent>
                <DialogActions sx={{ display: 'flex', gap: 1, px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setOpenPasswordDialog(false)}
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
                        {loadingPassword ? 'Memeriksa...' : 'Konfirmasi'}
                    </Button>
                </DialogActions>
            </Dialog>

        </PageContainer>
    );
}