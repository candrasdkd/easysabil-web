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
    CircularProgress
} from '@mui/material';
import {
    DataGrid,
    GridActionsCellItem,
    gridClasses,
    type GridColDef,
    type GridPaginationModel,
    type GridSortModel,
    type GridEventListener,
    GridFilterListIcon,
} from '@mui/x-data-grid';
import DownloadIcon from '@mui/icons-material/Download';
import { GridToolbar } from '@mui/x-data-grid/internals';
import { useNavigate } from 'react-router';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import dayjs from 'dayjs';
import PageContainer from './PageContainer';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import { type Member } from '../types/Member';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import 'dayjs/locale/id'; // import bahasa Indonesia
dayjs.locale('id');
const INITIAL_PAGE_SIZE = 30;

type Props = {
    loading?: boolean;
    members: Member[];
    refreshMembers?: () => void;
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
    const [allMembers, setAllMembers] = React.useState<Member[]>(members.filter((member) => !member.is_active));
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
    const [sortModel, setSortModel] = React.useState<GridSortModel>([]);
    const [rowsState, setRowsState] = React.useState<{
        rows: Member[];
        rowCount: number;
    }>({
        rows: [],
        rowCount: 0,
    });
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const loadData = React.useCallback(() => {
        setError(null);
        try {
            const start = paginationModel.page * paginationModel.pageSize;
            const end = start + paginationModel.pageSize;

            let filteredRows = allMembers;
            if (searchText.trim()) {
                const lowerSearch = searchText.toLowerCase();
                filteredRows = filteredRows.filter((member) =>
                    Object.entries(member).some(([key, value]) => {
                        if (!value) return false;
                        if (key === 'family_name') {
                            return false; // lanjut cek kolom lain
                        }

                        let stringValue = String(value);
                        // Kalau kolomnya date_of_birth → format ke Indo
                        if (key === 'date_of_birth') {
                            stringValue = dayjs(value).format('DD MMMM YYYY');
                        }
                        return stringValue.toLowerCase().includes(lowerSearch);
                    })
                );
            }
            if (selectedGender.length > 0) {
                filteredRows = filteredRows.filter((member) =>
                    selectedGender.includes(member.gender)
                );
            }
            if (selectedLevel.length > 0) {
                filteredRows = filteredRows.filter((member) =>
                    selectedLevel.includes(member.level)
                );
            }
            if (selectedMarriageStatus.length > 0) {
                filteredRows = filteredRows.filter((member) =>
                    selectedMarriageStatus.includes(member.marriage_status)
                );
            }
            let sortedRows = [...filteredRows];
            if (sortModel.length > 0) {
                const { field, sort } = sortModel[0];
                sortedRows.sort((a, b) => {
                    const aValue = a[field as keyof Member];
                    const bValue = b[field as keyof Member];
                    const aStr = String(aValue ?? '').toLowerCase();
                    const bStr = String(bValue ?? '').toLowerCase();
                    if (aStr < bStr) return sort === 'asc' ? -1 : 1;
                    if (aStr > bStr) return sort === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            const pagedRows = sortedRows.slice(start, end).map((member) => ({
                ...member,
                id: member.uuid,
            }));

            setRowsState({
                rows: pagedRows,
                rowCount: filteredRows.length,
            });
        } catch (listDataError) {
            setError(listDataError as Error);
        }
    }, [paginationModel, sortModel, allMembers, searchText, selectedGender, selectedLevel]);

    React.useEffect(() => {
        setAllMembers(members);
    }, [members]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);
    const highlightMatch = (text: string, search: string) => {
        if (!search) return text;

        const regex = new RegExp(`(${search})`, 'gi');
        const parts = text.split(regex);

        return (
            <>
                {parts.map((part, index) =>
                    part.toLowerCase() === search.toLowerCase() ? (
                        <mark key={index}>{part}</mark>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </>
        );
    };

    const handleExportExcel = () => {
        // Filter info
        const filterInfo = [
            ['Filter yang Aktif:'],
            [`Jenis Kelamin: ${selectedGender.length > 0 ? selectedGender.join(', ') : 'Semua'}`],
            [`Jenjang Pendidikan: ${selectedLevel.length > 0 ? selectedLevel.join(', ') : 'Semua'}`],
            [`Status Pernikahan: ${selectedMarriageStatus.length > 0 ? selectedMarriageStatus.join(', ') : 'Semua'}`],
            [], // Kosongkan baris sebelum header tabel
        ];

        // Susun data yang akan diekspor
        const dataToExport = allMembers
            .filter((member) => {
                // Terapkan filter sama seperti di loadData()
                if (
                    (selectedGender.length > 0 && !selectedGender.includes(member.gender)) ||
                    (selectedLevel.length > 0 && !selectedLevel.includes(member.level)) ||
                    (selectedMarriageStatus.length > 0 && !selectedMarriageStatus.includes(member.marriage_status))
                ) {
                    return false;
                }

                if (searchText.trim()) {
                    const lowerSearch = searchText.toLowerCase();
                    return Object.values(member).some((value) =>
                        String(value).toLowerCase().includes(lowerSearch)
                    );
                }

                return true;
            }).map((row) => ({
                'Nama Lengkap': row.name,
                'Jenjang': row.level,
                'Jenis Kelamin': row.gender,
                'Umur': row.age,
                'Tanggal Lahir': row.date_of_birth
                    ? dayjs(row.date_of_birth).format('DD MMMM YYYY')
                    : '',
                'Status Pernikahan': row.marriage_status,
            }));

        const header = Object.keys(dataToExport[0] || {});
        const dataWithHeader = [header, ...dataToExport.map(row => Object.values(row))];
        const fullData = [...filterInfo, ...dataWithHeader];
        const worksheet = XLSX.utils.aoa_to_sheet(fullData);

        worksheet['!cols'] = [
            { wch: 30 }, // Nama Lengkap
            { wch: 15 }, // Jenjang Pendidikan
            { wch: 15 }, // Jenis Kelamin
            { wch: 10 }, // Umur
            { wch: 20 }, // Tanggal Lahir
            { wch: 20 }, // Status Pernikahan
        ];

        // Buat workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Member');

        // Simpan sebagai file Excel
        const excelBuffer = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
        });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, 'Data_Jamaah_Kelompok_1.xlsx');
    };


    const handleRowClick = React.useCallback<GridEventListener<'rowClick'>>(
        ({ row }) => {
            navigate(`/members/${row.uuid}`);
        },
        [navigate]
    );

    const handleCreateClick = React.useCallback(() => {
        navigate('/members/new');
    }, [navigate]);

    const handleRowEdit = React.useCallback(
        (member: Member) => () => {
            navigate(`/members/${member.uuid}/edit`);
        },
        [navigate]
    );

    const handleRowDelete = React.useCallback(
        (member: Member) => () => {
            verifyPasswordAndRun('superadmin354', async () => {
                const confirmed = await dialogs.confirm(
                    `Kamu yakin ingin menghapus data ini?`,
                    {
                        title: `Hapus ${member.name}?`,
                        severity: 'error',
                        okText: 'Delete',
                        cancelText: 'Cancel',
                    },
                );

                if (confirmed) {
                    try {
                        notifications.show('Employee deleted successfully.', {
                            severity: 'success',
                            autoHideDuration: 3000,
                        });
                        loadData();
                    } catch (deleteError) {
                        notifications.show(
                            `Failed to delete employee. Reason:' ${(deleteError as Error).message}`,
                            {
                                severity: 'error',
                                autoHideDuration: 3000,
                            },
                        );
                    }
                }
            });
        },
        [dialogs, notifications, loadData]
    );

    const verifyPasswordAndRun = (expectedPassword: string, action: () => void) => {
        setRequiredPassword(expectedPassword);
        setPendingAction(() => action);
        setPassword('');
        setOpenPasswordDialog(true);
    };

    const handleResetFilters = () => {
        setSelectedGender([]);
        setSelectedLevel([]);
        setSelectedMarriageStatus([]);
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
        setSearchText('');
        loadData();
    };

    const columns = React.useMemo<GridColDef[]>(
        () => [
            {
                field: 'name',
                headerName: 'NAMA',
                width: 200,
                headerAlign: 'center',
                renderCell: (params) => highlightMatch(params.row.name, searchText),
            },
            {
                field: 'level',
                headerName: 'JENJANG',
                width: 140,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => highlightMatch(params.row.level, searchText),
            },
            {
                field: 'gender',
                headerName: 'JENIS KELAMIN',
                width: 140,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => highlightMatch(params.row.gender, searchText),
            },
            {
                field: 'age',
                headerName: 'UMUR',
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => highlightMatch(params.row.age, searchText),
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
                renderCell: (params) => highlightMatch(
                    dayjs(params.row.date_of_birth).format('DD MMMM YYYY'),
                    searchText
                ),
            },
            {
                field: 'marriage_status',
                headerName: 'STATUS PERNIKAHAN',
                type: 'singleSelect',
                valueOptions: ['Belum Menikah', 'Menikah', 'Janda', 'Duda'],
                width: 180,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => highlightMatch(params.row.marriage_status, searchText),
            },
            {
                field: 'actions',
                headerName: 'ACTIONS',
                type: 'actions',
                width: 100,
                align: 'center',
                headerAlign: 'center',
                getActions: ({ row }) => [
                    <GridActionsCellItem
                        key="edit-item"
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={handleRowEdit(row)}
                    />,
                    <GridActionsCellItem
                        key="delete-item"
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={handleRowDelete(row)}
                    />,
                ],
            },
        ],
        [handleRowEdit, handleRowDelete]
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
                    <Button
                        variant="contained"
                        onClick={handleCreateClick}
                        startIcon={<AddIcon />}
                    >
                        Tambah
                    </Button>
                </Stack>
            }
        >
            <Box sx={{ flex: 1, width: '100%', position: 'relative' }}>
                <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" >
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
                        pagination
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        sortingMode="server"
                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
                        disableRowSelectionOnClick
                        onRowClick={handleRowClick}
                        loading={loading}
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
                            [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                                outline: 'transparent',
                            },
                            [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
                                outline: 'none',
                            },
                            [`& .${gridClasses.row}:hover`]: {
                                cursor: 'pointer',
                            },
                        }}
                    />
                )}
            </Box>

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

            <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
                <Box p={3}>
                    <Typography variant="h6" mb={2}>Filter Data Member</Typography>
                    <Stack spacing={2}>
                        <TextField
                            label="Jenis Kelamin"
                            size="small"
                            select
                            SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(', ') }}
                            value={selectedGender}
                            onChange={(e) => {
                                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                setSelectedGender(value);
                            }}
                        >
                            {['Laki-laki', 'Perempuan'].map((gender) => (
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
                            SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(', ') }}
                            value={selectedLevel}
                            onChange={(e) => {
                                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                setSelectedLevel(value);
                            }}
                        >
                            {Array.from(new Set(members.map((m) => m.level))).map((level) => (
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
                            SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(', ') }}
                            value={selectedMarriageStatus}
                            onChange={(e) => {
                                const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                setSelectedMarriageStatus(value);
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
                                loadData();
                                setFilterDialogOpen(false);
                            }}
                        >
                            Terapkan
                        </Button>
                    </Stack>
                </Box>
            </Dialog>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
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
                        size={isMobile ? 'small' : 'medium'} // <-- kecil kalau mobile
                        sx={{
                            width: isMobile ? 40 : 56,  // bisa custom lebar
                            height: isMobile ? 40 : 56,
                        }}
                    >
                        <GridFilterListIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </Fab>
                </Tooltip>

                <Tooltip title="Export Excel" arrow>
                    <Fab
                        color="primary"
                        onClick={handleExportExcel}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{
                            width: isMobile ? 40 : 56,
                            height: isMobile ? 40 : 56,
                        }}
                    >
                        <DownloadIcon fontSize={isMobile ? 'small' : 'medium'} />
                    </Fab>
                </Tooltip>
            </Box>

        </PageContainer>
    );
}
