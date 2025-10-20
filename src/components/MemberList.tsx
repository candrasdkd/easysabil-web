import * as React from 'react';
import {
    Box,
    Button,
    Dialog,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Alert,
    MenuItem,
    TablePagination,
    Checkbox,
    ListItemText,
    Fab,
    useTheme,
    useMediaQuery,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    DataGrid,
    GridActionsCellItem,
    gridClasses,
    type GridColDef,
    type GridPaginationModel,
    type GridEventListener,
    GridToolbar,
    type GridSortModel,
} from '@mui/x-data-grid';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import FilterListIcon from '@mui/icons-material/FilterList';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useNavigate } from 'react-router';
import PageContainer from './PageContainer';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { type Member } from '../types/Member';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../supabase/client';

dayjs.locale('id');

const INITIAL_PAGE_SIZE = 30;

type Props = {
    loading?: boolean;
    members: Member[];
    refreshMembers: () => void;
};

export default function MemberList({ loading, members, refreshMembers }: Props) {
    const navigate = useNavigate();
    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [searchText, setSearchText] = React.useState('');
    const [selectedGender, setSelectedGender] = React.useState<string[]>([]);
    const [selectedLevel, setSelectedLevel] = React.useState<string[]>([]);
    const [selectedMarriageStatus, setSelectedMarriageStatus] = React.useState<string[]>([]);
    const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);
    const [memberStatus, setMemberStatus] = React.useState<'Aktif' | 'Tidak Aktif' | 'Semua'>('Aktif');
    const [allMembers, setAllMembers] = React.useState<Member[]>(members);
    const [openPasswordDialog, setOpenPasswordDialog] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [loadingPassword, setLoadingPassword] = React.useState(false);
    const [requiredPassword, setRequiredPassword] = React.useState<string | null>(null);
    const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);
    const [error, setError] = React.useState<Error | null>(null);

    const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
        page: 0,
        pageSize: INITIAL_PAGE_SIZE,
    });
    const [sortModel, setSortModel] = React.useState<GridSortModel>([
        { field: 'order', sort: 'asc' },
    ]);
    const [rowsState, setRowsState] = React.useState<{ rows: Member[]; rowCount: number }>({
        rows: [],
        rowCount: 0,
    });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    React.useEffect(() => {
        setAllMembers(members);
    }, [members]);

    const highlightMatch = (text: string | number, search: string) => {
        const source = String(text ?? '');
        if (!search) return source;

        const regex = new RegExp(`(${search})`, 'gi');
        const parts = source.split(regex);

        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === search.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
                )}
            </>
        );
    };

    /**
     * Memoized hook to get filtered and sorted members.
     * This is the single source of truth for both DataGrid and Excel export.
     */
    const filteredAndSortedMembers = React.useMemo(() => {
        let filtered = allMembers;

        // 1. FILTER: is_educate (Filter tambahan)
        filtered = filtered.filter((m) => m.is_educate === false);

        // 2. FILTER: Status
        if (memberStatus === 'Aktif') {
            filtered = filtered.filter((m) => m.is_active === true);
        } else if (memberStatus === 'Tidak Aktif') {
            filtered = filtered.filter((m) => m.is_active === false);
        }

        // 3. FILTER: Gender
        if (selectedGender.length) {
            filtered = filtered.filter((m) => selectedGender.includes(m.gender));
        }
        // 4. FILTER: Level
        if (selectedLevel.length) {
            filtered = filtered.filter((m) => selectedLevel.includes(m.level));
        }
        // 5. FILTER: Marriage Status
        if (selectedMarriageStatus.length) {
            filtered = filtered.filter((m) => selectedMarriageStatus.includes(m.marriage_status));
        }

        // 6. FILTER: Search Text
        if (searchText.trim()) {
            const q = searchText.toLowerCase();
            filtered = filtered.filter((m) =>
                Object.entries(m).some(([key, value]) => {
                    if (value == null) return false;
                    if (key === 'family_name') return false; // Sesuai logic lama di loadData

                    let str = String(value);
                    if (key === 'date_of_birth') {
                        str = dayjs(value as string).format('DD MMMM YYYY');
                    }
                    return str.toLowerCase().includes(q);
                }),
            );
        }

        // 7. SORT
        if (sortModel.length > 0) {
            const { field, sort } = sortModel[0];

            filtered = filtered.sort((a, b) => {
                const aValue = a[field as keyof Member];
                const bValue = b[field as keyof Member];

                // Taruh nilai null/undefined di akhir
                if (aValue == null) return 1;
                if (bValue == null) return -1;

                let compare = 0;

                // Helper untuk mengonversi nilai date-like menjadi timestamp
                const toTimestamp = (v: unknown): number => {
                    if (v instanceof Date) return v.getTime();
                    if (typeof v === 'string') {
                        const t = Date.parse(v);
                        return isNaN(t) ? NaN : t;
                    }
                    return NaN;
                };

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    compare = aValue - bValue;
                } else {
                    const aTime = toTimestamp(aValue);
                    const bTime = toTimestamp(bValue);
                    if (!isNaN(aTime) && !isNaN(bTime)) {
                        compare = aTime - bTime;
                    } else {
                        // Default ke perbandingan string
                        compare = String(aValue ?? '').localeCompare(String(bValue ?? ''));
                    }
                }

                return sort === 'desc' ? -compare : compare;
            });
        }

        return filtered;
    }, [
        allMembers,
        searchText,
        memberStatus,
        selectedGender,
        selectedLevel,
        selectedMarriageStatus,
        sortModel,
    ]);

    /**
     * loadData now simply paginates the pre-filtered/sorted list
     */
    const loadData = React.useCallback(() => {
        setError(null);
        try {
            const start = paginationModel.page * paginationModel.pageSize;
            const end = start + paginationModel.pageSize;

            // Gunakan data yang sudah difilter dan disortir
            const pageRows = filteredAndSortedMembers.slice(start, end).map((m) => ({ ...m, id: m.uuid }));

            setRowsState({
                rows: pageRows,
                rowCount: filteredAndSortedMembers.length,
            });
        } catch (e) {
            setError(e as Error);
        }
    }, [
        filteredAndSortedMembers, // Hanya bergantung pada list & paginasi
        paginationModel.page,
        paginationModel.pageSize,
    ]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRowClick = React.useCallback<GridEventListener<'rowClick'>>(
        ({ row }) => {
            navigate(`/members/${row.uuid}`);
        },
        [navigate],
    );

    const handleCreateClick = React.useCallback(() => {
        navigate('/members/new');
    }, [navigate]);

    const handleRowEdit = React.useCallback(
        (member: Member) => () => {
            navigate(`/members/${member.uuid}/edit`);
        },
        [navigate],
    );

    const verifyPasswordAndRun = (expectedPassword: string, action: () => void) => {
        setRequiredPassword(expectedPassword);
        setPendingAction(() => action);
        setPassword('');
        setOpenPasswordDialog(true);
    };

    const handleRowDelete = React.useCallback(
        (member: Member) => () => {
            verifyPasswordAndRun('superadmin354', async () => {
                const confirmed = await dialogs.confirm(`Kamu yakin ingin menghapus data ini?`, {
                    title: `Hapus ${member.name}?`,
                    severity: 'error',
                    okText: 'Delete',
                    cancelText: 'Cancel',
                });

                if (!confirmed) return;

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
                        loadData(); // loadData akan otomatis mengambil dari useMemo yang baru
                        refreshMembers(); // refresh allMembers
                    }
                } catch (deleteError) {
                    notifications.show(`Gagal menghapus data. Reason: ${(deleteError as Error).message}`, {
                        severity: 'error',
                        autoHideDuration: 3000,
                    });
                }
            });
        },
        [dialogs, notifications, loadData, refreshMembers], // loadData sdh di-memoized
    );

    const handlePasswordSubmit = () => {
        if (!password.trim()) {
            notifications.show('Password tidak boleh kosong', { severity: 'warning' });
            return;
        }
        setLoadingPassword(true);
        setTimeout(() => {
            if (password === requiredPassword) {
                setOpenPasswordDialog(false);
                pendingAction?.();
            } else {
                notifications.show('Password salah', { severity: 'error', autoHideDuration: 3000 });
            }
            setLoadingPassword(false);
        }, 800);
    };

    const handleResetFilters = () => {
        setSelectedGender([]);
        setSelectedLevel([]);
        setSelectedMarriageStatus([]);
        setMemberStatus('Aktif');
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
        setSearchText('');
    };

    const columns = React.useMemo<GridColDef<Member>[]>(
        () => [
            {
                field: 'name',
                headerName: 'NAMA',
                width: 220,
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.name, searchText),
            },
            {
                field: 'level',
                headerName: 'JENJANG',
                width: 140,
                align: 'center',
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.level, searchText),
            },
            {
                field: 'gender',
                headerName: 'JENIS KELAMIN',
                width: 150,
                align: 'center',
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.gender, searchText),
            },
            {
                field: 'age',
                headerName: 'UMUR',
                width: 110,
                align: 'center',
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.age ?? '', searchText),
            },
            {
                field: 'date_of_birth',
                headerName: 'TANGGAL LAHIR',
                type: 'date',
                valueGetter: (value) => value && new Date(value),
                valueFormatter: (value) => {
                    if (!value) return '';
                    return dayjs(value).format('DD MMMM YYYY');
                },
                width: 140,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) =>
                    highlightMatch(dayjs(params.row.date_of_birth).format('DD MMMM YYYY'), searchText),
            },
            {
                field: 'marriage_status',
                headerName: 'STATUS PERNIKAHAN',
                type: 'singleSelect',
                width: 200,
                align: 'center',
                headerAlign: 'center',
                valueOptions: ['Belum Menikah', 'Menikah', 'Janda', 'Duda'],
                renderCell: (p) => highlightMatch(p.row.marriage_status, searchText),
            },
            {
                field: 'family_name',
                headerName: 'KELUARGA',
                width: 100,
                align: 'center',
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.family_name, searchText),
            },
            {
                field: 'order',
                headerName: 'URUTAN',
                type: 'number',
                width: 100,
                align: 'center',
                headerAlign: 'center',
                renderCell: (p) => highlightMatch(p.row.order, searchText),
            },
            {
                field: 'actions',
                headerName: 'ACTIONS',
                type: 'actions',
                width: 100,
                align: 'center',
                headerAlign: 'center',
                getActions: ({ row }) => [
                    <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit" onClick={handleRowEdit(row)} />,
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={handleRowDelete(row)}
                    />,
                ],
            },
        ],
        [handleRowEdit, handleRowDelete, searchText],
    );

    /**
     * handleExportExcel now uses the memoized, sorted, and filtered data
     */
    const handleExportExcel = () => {
        const filterInfo = [
            ['Filter yang Aktif:'],
            [`Status Keaktifan: ${memberStatus}`],
            [`Jenis Kelamin: ${selectedGender.length ? selectedGender.join(', ') : 'Semua'}`],
            [`Jenjang Pendidikan: ${selectedLevel.length ? selectedLevel.join(', ') : 'Semua'}`],
            [`Status Pernikahan: ${selectedMarriageStatus.length ? selectedMarriageStatus.join(', ') : 'Semua'}`],
            [`Pencarian: ${searchText.trim() || 'Tidak ada'}`],
            [],
        ];

        // Gunakan data yang SUDAH difilter dan disortir
        const data = filteredAndSortedMembers.map((row) => ({
            'Nama Lengkap': row.name,
            'Status Aktif': row.is_active ? 'Aktif' : 'Tidak Aktif',
            Jenjang: row.level,
            'Jenis Kelamin': row.gender,
            Umur: row.age,
            'Tanggal Lahir': row.date_of_birth ? dayjs(row.date_of_birth).format('DD MMMM YYYY') : '',
            'Status Pernikahan': row.marriage_status,
            Keluarga: row.family_name,
            Urutan: row.order,
        }));

        const header = data.length > 0 ? Object.keys(data[0]) : [];
        const dataWithHeader = [header, ...data.map((r) => Object.values(r))];
        const fullData = [...filterInfo, ...dataWithHeader];
        const ws = XLSX.utils.aoa_to_sheet(fullData);

        // Sesuaikan lebar kolom (menambahkan 2 kolom baru)
        ws['!cols'] = [
            { wch: 30 }, // Nama
            { wch: 15 }, // Status
            { wch: 15 }, // Jenjang
            { wch: 15 }, // Gender
            { wch: 10 }, // Umur
            { wch: 20 }, // Tgl Lahir
            { wch: 20 }, // Status Nikah
            { wch: 15 }, // Keluarga
            { wch: 10 }, // Urutan
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Data Member');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, 'Data_Jamaah.xlsx');
    };

    return (
        <PageContainer
            title="Members"
            actions={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        <div>
                            <IconButton size="small" aria-label="refresh" onClick={refreshMembers}>
                                <RefreshIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                    <Button variant="contained" onClick={handleCreateClick} startIcon={<AddIcon />}>
                        Tambah
                    </Button>
                </Stack>
            }
        >
            <Box sx={{ flex: 1, width: '100%', position: 'relative' }}>
                <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
                    <TextField
                        label="Cari Apapun"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        size="small"
                        fullWidth
                    />
                </Stack>

                {error ? (
                    <Alert severity="error">{error.message}</Alert>
                ) : (
                    <DataGrid
                        rows={rowsState.rows}
                        rowCount={rowsState.rowCount}
                        columns={columns}
                        paginationMode="server"
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        disableRowSelectionOnClick
                        onRowClick={handleRowClick}
                        loading={loading}
                        sortingMode="server"
                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
                        slots={{
                            toolbar: GridToolbar,
                            pagination: () => (
                                <TablePagination
                                    component="div"
                                    count={rowsState.rowCount}
                                    page={paginationModel.page}
                                    onPageChange={(_, newPage) =>
                                        setPaginationModel((prev) => ({ ...prev, page: newPage }))
                                    }
                                    rowsPerPage={paginationModel.pageSize}
                                    onRowsPerPageChange={(e) =>
                                        setPaginationModel({
                                            page: 0,
                                            pageSize: parseInt(e.target.value, 10),
                                        })
                                    }
                                    rowsPerPageOptions={[15, 30, 50, 100]}
                                    labelRowsPerPage="Show Data"
                                />
                            ),
                        }}
                        sx={{
                            [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: { outline: 'transparent' },
                            [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
                                outline: 'none',
                            },
                            [`& .${gridClasses.row}:hover`]: { cursor: 'pointer' },
                        }}
                    />
                )}
            </Box>

            {/* Password Dialog */}
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
                    <Button onClick={() => setOpenPasswordDialog(false)} variant="outlined" color="inherit" fullWidth>
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

            {/* Filter Dialog */}
            <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
                <Box p={3}>
                    <Typography variant="h6" mb={2}>
                        Filter Data Member
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            select
                            label="Status Keaktifan"
                            value={memberStatus}
                            onChange={(e) => setMemberStatus(e.target.value as 'Aktif' | 'Tidak Aktif' | 'Semua')}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="Semua">Semua</MenuItem>
                            <MenuItem value="Aktif">Aktif</MenuItem>
                            <MenuItem value="Tidak Aktif">Tidak Aktif</MenuItem>
                        </TextField>

                        <TextField
                            label="Jenis Kelamin"
                            size="small"
                            select
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => (selected as string[]).join(', '),
                            }}
                            value={selectedGender}
                            onChange={(e) => {
                                const v =
                                    typeof e.target.value === 'string'
                                        ? e.target.value.split(',')
                                        : (e.target.value as string[]);
                                setSelectedGender(v);
                            }}
                        >
                            {['Laki - Laki', 'Perempuan'].map((gender) => (
                                <MenuItem key={gender} value={gender}>
                                    <Checkbox checked={selectedGender.includes(gender)} />
                                    <ListItemText primary={gender} />
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Jenjang"
                            size="small"
                            select
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => (selected as string[]).join(', '),
                            }}
                            value={selectedLevel}
                            onChange={(e) => {
                                const v =
                                    typeof e.target.value === 'string'
                                        ? e.target.value.split(',')
                                        : (e.target.value as string[]);
                                setSelectedLevel(v);
                            }}
                        >
                            {Array.from(new Set(allMembers.map((m) => m.level)))
                                .sort()
                                .map((level) => (
                                    <MenuItem key={level} value={level}>
                                        <Checkbox checked={selectedLevel.includes(level)} />
                                        <ListItemText primary={level} />
                                    </MenuItem>
                                ))}
                        </TextField>

                        <TextField
                            label="Status Pernikahan"
                            size="small"
                            select
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => (selected as string[]).join(', '),
                            }}
                            value={selectedMarriageStatus}
                            onChange={(e) => {
                                const v =
                                    typeof e.target.value === 'string'
                                        ? e.target.value.split(',')
                                        : (e.target.value as string[]);
                                setSelectedMarriageStatus(v);
                            }}
                        >
                            {['Belum Menikah', 'Menikah', 'Janda', 'Duda'].map((status) => (
                                <MenuItem key={status} value={status}>
                                    <Checkbox checked={selectedMarriageStatus.includes(status)} />
                                    <ListItemText primary={status} />
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <Stack direction="row" justifyContent="flex-end" spacing={2} mt={3}>
                        <Button onClick={handleResetFilters} color="error">
                            Reset Filter
                        </Button>
                        <Button onClick={() => setFilterDialogOpen(false)}>Tutup</Button>
                        <Button
                            variant="contained"
                            onClick={() => {
                                setPaginationModel((prev) => ({ ...prev, page: 0 }));
                                // loadData(); // loadData akan dipanggil oleh useEffect
                                setFilterDialogOpen(false);
                            }}
                        >
                            Terapkan
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Floating Actions */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    zIndex: 1300,
                }}
            >
                <Tooltip title="Filter Data" arrow>
                    <Fab
                        color="secondary"
                        onClick={() => setFilterDialogOpen(true)}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ width: isMobile ? 40 : 56, height: isMobile ? 40 : 56 }}
                    >
                        <FilterListIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </Fab>
                </Tooltip>

                <Tooltip title="Export Excel" arrow>
                    <Fab
                        color="primary"
                        onClick={handleExportExcel}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ width: isMobile ? 40 : 56, height: isMobile ? 40 : 56 }}
                    >
                        <DownloadIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </Fab>
                </Tooltip>
            </Box>
        </PageContainer>
    );
}