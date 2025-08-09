import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    Divider,
    CardHeader,
    Avatar,
    useTheme
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import HomeIcon from '@mui/icons-material/Home';
import { type Familys, type Member } from '../types/Member';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import copy from 'copy-to-clipboard';
import { Skeleton } from '@mui/material';

interface DashboardProps {
    members: Member[];
    listFamily: Familys[];
    loading: boolean;
}

export default function Dashboard({ loading, members, listFamily }: DashboardProps) {
    const theme = useTheme();
    const total = members.filter(
        m => m.is_active && !m.is_educate
    ).length || 0;
    const totalKepalaKeluarga = listFamily?.length - 2 || 0; //rantuan dan binaan dikurangi

    const statsByLevelAndGender = members.filter(
        m => m.is_active && !m.is_educate
    ).reduce((acc, member) => {
        const level = member.level || 'Unknown';
        const gender = member.gender || 'Unknown';

        if (!acc[level]) {
            acc[level] = { Male: 0, Female: 0, Unknown: 0 };
        }

        if (gender === 'Laki - Laki') {
            acc[level].Male += 1;
        } else if (gender === 'Perempuan') {
            acc[level].Female += 1;
        } else {
            acc[level].Unknown += 1;
        }

        return acc;
    }, {} as Record<string, { Male: number; Female: number; Unknown: number }>);

    const totalDuda = members.filter(m => m.marriage_status === 'Duda').length;
    const totalJanda = members.filter(m => m.marriage_status === 'Janda').length;
    const totalDuafa = members.filter(m => m.is_duafa).length;
    const totalBinaan = members.filter(m => m.is_educate).length;

    const handleCopy = () => {
        const text = generateSummaryText();
        copy(text);
        alert('Ringkasan berhasil disalin ke clipboard!');
    };

    const handleShareWhatsApp = () => {
        const text = generateSummaryText();
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const generateSummaryText = () => {
        let summary = `🌟 *LAPORAN STATISTIK ANGGOTA* 🌟\n\n`;

        summary += `📌 *DATA UTAMA*\n`;
        summary += `▫️ Total Anggota: *${total}* orang\n`;
        summary += `▫️ Kepala Keluarga: *${totalKepalaKeluarga}* KK\n`;
        summary += `▫️ Status: Duda *${totalDuda}* | Janda *${totalJanda}*\n`;
        summary += `▫️ Duafa: *${totalDuafa}* orang\n`;
        summary += `▫️ Binaan: *${totalBinaan}* orang\n\n`;

        summary += `📈 *DISTRIBUSI LEVEL & GENDER*\n`;
        Object.entries(statsByLevelAndGender).forEach(([level, g]) => {
            summary += `\n🔸 *${level.toUpperCase()}*\n`;
            summary += `├ Laki-laki: ${g.Male} orang\n`;
            summary += `├ Perempuan: ${g.Female} orang\n`;
            if (g.Unknown > 0) summary += `└ Tidak diketahui: ${g.Unknown} orang\n`;
        });

        summary += `\n📊 *RINGKASAN*\n`;
        summary += `Total anggota aktif dengan distribusi merata di berbagai level pendidikan.\n\n`;

        summary += `#StatistikAnggota #DataTerbaru #Komunitas`;

        return summary;
    };

    return (
        <Box sx={{ minHeight: '100vh' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom color="text.primary">
                Dashboard Anggota
            </Typography>
            {loading ? (
                <Grid container spacing={3}>
                    {[...Array(6)].map((_, i) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                            <Skeleton variant="rounded" height={180} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <>
                    <Grid container spacing={3}>
                        {/* Total Anggota */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: theme.palette.primary.light,
                                    color: 'primary.contrastText',
                                    borderRadius: 3
                                }}
                                elevation={6}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            <PeopleIcon />
                                        </Avatar>
                                    }
                                    title="Total Anggota"
                                    titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                />
                                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h2" fontWeight="bold">
                                        {total}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Total Kepala Keluarga */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: theme.palette.secondary.light,
                                    color: 'secondary.contrastText',
                                    borderRadius: 3
                                }}
                                elevation={6}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                            <HomeIcon />
                                        </Avatar>
                                    }
                                    title="Kepala Keluarga"
                                    titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                />
                                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h2" fontWeight="bold">
                                        {totalKepalaKeluarga}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Status Perkawinan */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: theme.palette.warning.light,
                                    color: 'warning.contrastText',
                                    borderRadius: 3
                                }}
                                elevation={6}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                                            <FavoriteIcon />
                                        </Avatar>
                                    }
                                    title="Status Perkawinan"
                                    titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                />
                                <CardContent sx={{ flexGrow: 1, }}>
                                    <Divider sx={{ mb: 2 }} />
                                    <Grid container spacing={2} justifyContent={'space-around'}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Typography variant="body1" fontWeight={"bold"}>
                                                Duda
                                            </Typography>
                                            <Typography
                                                variant="h2"
                                                fontWeight="bold"
                                            >
                                                {totalDuda}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Typography variant="body1" fontWeight={"bold"}>
                                                Janda
                                            </Typography>
                                            <Typography
                                                variant="h2"
                                                fontWeight="bold"
                                            >
                                                {totalJanda}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Total Duafa */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: theme.palette.success.light,
                                    color: 'success.contrastText',
                                    borderRadius: 3
                                }}
                                elevation={6}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'success.main' }}>
                                            <CheckCircleIcon />
                                        </Avatar>
                                    }
                                    title="Total Duafa"
                                    titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                />
                                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h2" fontWeight="bold">
                                        {totalDuafa}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Total Binaan */}
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    bgcolor: theme.palette.info.light,
                                    color: 'info.contrastText',
                                    borderRadius: 3
                                }}
                                elevation={6}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'info.main' }}>
                                            <SchoolIcon />
                                        </Avatar>
                                    }
                                    title="Total Binaan"
                                    titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                />
                                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="h2" fontWeight="bold">
                                        {totalBinaan}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Stats by Level */}
                        {Object.entries(statsByLevelAndGender).map(([level, genders]) => (
                            <Grid size={{ xs: 6, sm: 6, md: 4 }} key={level}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 3,
                                        bgcolor: theme.palette.background.paper
                                    }}
                                    elevation={3}
                                >
                                    <CardHeader
                                        avatar={
                                            <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                                                <GroupWorkIcon />
                                            </Avatar>
                                        }
                                        title={level}
                                        titleTypographyProps={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                                    />
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Divider sx={{ mb: 2 }} />
                                        <Grid container spacing={2}>
                                            {/* Untuk tampilan mobile (xs), kita gabungkan data dalam 2 kolom */}
                                            <Grid size={{ xs: 6, sm: 6 }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Laki-laki
                                                    </Typography>
                                                    <Typography
                                                        variant="h5"
                                                        fontWeight="bold"
                                                        color="primary"
                                                    >
                                                        {genders.Male}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 6 }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Perempuan
                                                    </Typography>
                                                    <Typography
                                                        variant="h5"
                                                        fontWeight="bold"
                                                        color="secondary"
                                                    >
                                                        {genders.Female}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            {genders.Unknown > 0 && (
                                                <Grid size={{ xs: 12 }}>
                                                    <Typography
                                                        variant="body2"
                                                        align="center"
                                                        color="warning.main"
                                                        sx={{ mt: 2 }}
                                                    >
                                                        Tidak diketahui:{' '}
                                                        <Box component="span" fontWeight="bold">
                                                            {genders.Unknown}
                                                        </Box>
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    {/* Floating Action Buttons */}
                    <Box
                        sx={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            zIndex: 999
                        }}
                    >
                        <Tooltip title="Salin ke Clipboard" arrow>
                            <Fab color="primary" onClick={handleCopy}>
                                <ContentCopyIcon />
                            </Fab>
                        </Tooltip>

                        <Tooltip title="Bagikan ke WhatsApp" arrow>
                            <Fab color="success" onClick={handleShareWhatsApp}>
                                <ShareIcon />
                            </Fab>
                        </Tooltip>
                    </Box>
                </>
            )
            }


        </Box>
    );
}
