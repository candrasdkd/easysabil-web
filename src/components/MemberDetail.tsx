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
    deleteOne as deleteEmployee,
    getOne as getMember,
    type Member,
} from '../types/Member';
import PageContainer from './PageContainer';

export default function EmployeeShow() {
    const { id } = useParams();
    const navigate = useNavigate();

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [member, setMember] = React.useState<Member | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

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

    const handleMemberEdit = React.useCallback(() => {
        navigate(`/members/${id}/edit`);
    }, [navigate, id]);

    const handleEmployeeDelete = React.useCallback(async () => {
        if (!member) {
            return;
        }

        const confirmed = await dialogs.confirm(
            `Do you wish to delete ${member.name}?`,
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
                await deleteEmployee(String(id));

                navigate('/members');

                notifications.show('Member deleted successfully.', {
                    severity: 'success',
                    autoHideDuration: 3000,
                });
            } catch (deleteError) {
                notifications.show(
                    `Failed to delete member. Reason:' ${(deleteError as Error).message}`,
                    {
                        severity: 'error',
                        autoHideDuration: 3000,
                    },
                );
            }
            setIsLoading(false);
        }
    }, [member, dialogs, id, navigate, notifications]);

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
                            <Typography variant="overline">Name</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.name}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Category</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.level}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Gender</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.gender}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Age</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.age}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Date of Birth</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {dayjs(member.date_of_birth).format('DD MMMM YYYY')}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Marriage Status</Typography>
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
                            <Typography variant="overline">Active</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_active ? 'Yes' : 'No'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Duafa</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_duafa ? 'Yes' : 'No'}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper sx={{ px: 2, py: 1 }}>
                            <Typography variant="overline">Educate</Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                {member.is_educate ? 'Yes' : 'No'}
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
        </PageContainer>
    );
}