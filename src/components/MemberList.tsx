import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import {
    DataGrid,
    GridActionsCellItem,
    type GridColDef,
    type GridFilterModel,
    type GridPaginationModel,
    type GridSortModel,
    type GridEventListener,
    gridClasses,
} from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useDialogs } from '../hooks/useDialogs/useDialogs';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    type Member,
} from '../types/Member';
import PageContainer from './PageContainer';
import { Dialog, TablePagination, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { GridToolbar } from '@mui/x-data-grid/internals';

const INITIAL_PAGE_SIZE = 30;

type Props = {
    loading?: boolean;
    members: Member[];
    refreshMembers?: () => void;
};

export default function MemberList({ loading, members, refreshMembers }: Props) {
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [allMembers, setAllMembers] = React.useState<Member[]>(members);
    const [openPasswordDialog, setOpenPasswordDialog] = React.useState(false);
    const [password, setPassword] = React.useState('');
    const [requiredPassword, setRequiredPassword] = React.useState<string | null>(null);
    const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(null);


    const dialogs = useDialogs();
    const notifications = useNotifications();

    const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
        pageSize: searchParams.get('pageSize')
            ? Number(searchParams.get('pageSize'))
            : INITIAL_PAGE_SIZE,
    });
    const [filterModel, setFilterModel] = React.useState<GridFilterModel>(
        searchParams.get('filter')
            ? JSON.parse(searchParams.get('filter') ?? '')
            : { items: [] },
    );
    const [sortModel, setSortModel] = React.useState<GridSortModel>(
        searchParams.get('sort') ? JSON.parse(searchParams.get('sort') ?? '') : [],
    );

    const [rowsState, setRowsState] = React.useState<{
        rows: Member[];
        rowCount: number;
    }>({
        rows: [],
        rowCount: 0,
    });

    const [error, setError] = React.useState<Error | null>(null);

    const handlePaginationModelChange = React.useCallback(
        (model: GridPaginationModel) => {
            setPaginationModel(model);

            searchParams.set('page', String(model.page));
            searchParams.set('pageSize', String(model.pageSize));

            const newSearchParamsString = searchParams.toString();

            navigate(
                `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
            );
        },
        [navigate, pathname, searchParams],
    );

    const handleFilterModelChange = React.useCallback(
        (model: GridFilterModel) => {
            setFilterModel(model);

            if (
                model.items.length > 0 ||
                (model.quickFilterValues && model.quickFilterValues.length > 0)
            ) {
                searchParams.set('filter', JSON.stringify(model));
            } else {
                searchParams.delete('filter');
            }

            const newSearchParamsString = searchParams.toString();

            navigate(
                `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
            );
        },
        [navigate, pathname, searchParams],
    );

    const handleSortModelChange = React.useCallback(
        (model: GridSortModel) => {
            setSortModel(model);

            if (model.length > 0) {
                searchParams.set('sort', JSON.stringify(model));
            } else {
                searchParams.delete('sort');
            }

            const newSearchParamsString = searchParams.toString();

            navigate(
                `${pathname}${newSearchParamsString ? '?' : ''}${newSearchParamsString}`,
            );
        },
        [navigate, pathname, searchParams],
    );

    const loadData = React.useCallback(() => {
        setError(null);
        try {
            const start = paginationModel.page * paginationModel.pageSize;
            const end = start + paginationModel.pageSize;
            console.log(filterModel);

            let filteredRows = allMembers.filter((member) => {
                return filterModel.items.every((filterItem) => {
                    const { field, value, operator } = filterItem;
                    const targetValue = member[field as keyof Member];
                    if (!value || !operator) return true;
                    const strVal = String(targetValue ?? '').toLowerCase();
                    const strFilter = String(value).toLowerCase();
                    switch (operator) {
                        case 'contains': return strVal.includes(strFilter);
                        case 'equals': return strVal === strFilter;
                        case 'doesNotContain': return !strVal.includes(strFilter);
                        case 'doesNotEqual': return strVal !== strFilter;
                        case 'greaterThan': return strVal > strFilter;
                        case 'greaterThanOrEqual': return strVal >= strFilter;
                        case 'lessThan': return strVal < strFilter;
                        case 'lessThanOrEqual': return strVal <= strFilter;
                        case 'between': return strVal > strFilter && strVal < strFilter;
                        case 'notBetween': return strVal < strFilter || strVal > strFilter;
                        case 'isEmpty': return !strVal;
                        case 'isNotEmpty': return !!strVal;
                        case 'startsWith': return strVal.startsWith(strFilter);
                        case 'endsWith': return strVal.endsWith(strFilter);
                        case 'isAnyOf': return (Array.isArray(value) && value.includes(strVal));
                        case 'isNoneOf': return (Array.isArray(value) && !value.includes(strVal));
                        case 'startsWithAnyOf': return (Array.isArray(value) && value.some((str) => strVal.startsWith(str)));
                        case 'endsWithAnyOf': return (Array.isArray(value) && value.some((str) => strVal.endsWith(str)));
                        case 'is': return strVal === strFilter;
                        case 'not': return strVal !== strFilter;
                        case 'isNotAnyOf': return (Array.isArray(value) && !value.includes(strVal));
                        case 'isNotNoneOf': return (Array.isArray(value) && value.includes(strVal));
                        case 'isNot': return strVal !== strFilter;
                        case 'isNotBetween': return strVal < strFilter || strVal > strFilter;
                        case 'isNotOneOf': return (Array.isArray(value) && !value.includes(strVal));
                        default: return true;
                    }
                });
            });

            if (filterModel.quickFilterValues?.length) {
                filteredRows = filteredRows.filter((member) =>
                    filterModel.quickFilterValues!.some((filterValue) => {
                        const v = filterValue.toLowerCase();
                        return Object.values(member).some((val) =>
                            String(val).toLowerCase().includes(v),
                        );
                    })
                );
            }

            // ✅ Sorting berdasarkan sortModel
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
    }, [paginationModel, sortModel, filterModel, allMembers]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    React.useEffect(() => {
        setAllMembers(members);
    }, [members]);

    const handleRowClick = React.useCallback<GridEventListener<'rowClick'>>(
        ({ row }) => {
            verifyPasswordAndRun('superadmin354', () => {
                navigate(`/members/${row.uuid}`);
            })
        },
        [navigate],
    );

    const handleCreateClick = React.useCallback(() => {
        verifyPasswordAndRun('admin354', () => {
            navigate('/members/new');
        });
    }, [navigate]);

    const handleRowEdit = React.useCallback(
        (member: Member) => () => {
            verifyPasswordAndRun('superadmin354', () => {
                navigate(`/members/${member.uuid}/edit`);
            });
        },
        [navigate],
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
        [dialogs, notifications, loadData],
    );

    const verifyPasswordAndRun = (expectedPassword: string, action: () => void) => {
        setRequiredPassword(expectedPassword);
        setPendingAction(() => action);
        setPassword('');
        setOpenPasswordDialog(true);
    };

    const handlePasswordConfirm = () => {
        if (password === requiredPassword) {
            setOpenPasswordDialog(false);
            setPassword('');
            setRequiredPassword(null);
            if (pendingAction) {
                pendingAction();
            }
        } else {
            notifications.show('Password Salah', {
                severity: 'error',
                autoHideDuration: 3000,
            });
        }
    };

    const initialState = React.useMemo(
        () => ({
            pagination: { paginationModel: { pageSize: INITIAL_PAGE_SIZE } },
        }),
        [],
    );

    const columns = React.useMemo<GridColDef[]>(
        () => [
            {
                field: 'name',
                headerName: 'NAMA',
                width: 200,
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'level',
                headerName: 'JENJANG',
                width: 140,
                align: 'center',
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'gender',
                headerName: 'JENIS KELAMIN',
                width: 140,
                align: 'center',
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'age',
                headerName: 'UMUR',
                align: 'center',
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'date_of_birth',
                headerName: 'TANGGAL LAHIR',
                type: 'date',
                valueGetter: (value) => value && new Date(value),
                valueFormatter: (value) => {
                    if (!value) return '';
                    return dayjs(value).format('DD MMMM YYYY')
                },
                width: 140,
                align: 'center',
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'marriage_status',
                headerName: 'STATUS PERNIKAHAN',
                type: 'singleSelect',
                valueOptions: ['Belum Menikah', 'Menikah', 'Janda', 'Duda'],
                width: 160,
                align: 'center',
                headerAlign: 'center',
                filterable: true,
            },
            {
                field: 'actions',
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
        [handleRowEdit, handleRowDelete],
    );

    const pageTitle = 'Members';

    return (
        <PageContainer
            title={pageTitle}
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
                {error ? (
                    <Box sx={{ flexGrow: 1 }}>
                        <Alert severity="error">{error.message}</Alert>
                    </Box>
                ) : (
                    <DataGrid
                        rows={rowsState.rows}
                        rowCount={rowsState.rowCount}
                        columns={columns}
                        pagination
                        sortingMode="server"
                        filterMode="server"
                        paginationMode="server"
                        paginationModel={paginationModel}
                        onPaginationModelChange={handlePaginationModelChange}
                        sortModel={sortModel}
                        onSortModelChange={handleSortModelChange}
                        filterModel={filterModel}
                        onFilterModelChange={handleFilterModelChange}
                        disableRowSelectionOnClick
                        disableMultipleRowSelection={false}
                        onRowClick={handleRowClick}
                        loading={loading}
                        initialState={initialState}
                        showToolbar
                        pageSizeOptions={[15, INITIAL_PAGE_SIZE, 50, 100]}
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
                        slotProps={{
                            loadingOverlay: {
                                variant: 'circular-progress',
                                noRowsVariant: 'circular-progress',
                            },
                            baseIconButton: {
                                size: 'small',
                            },
                        }}
                        slots={{
                            pagination: () => (
                                <TablePagination
                                    component="div"
                                    count={rowsState.rowCount}
                                    page={paginationModel.page}
                                    onPageChange={(_, newPage) => {
                                        handlePaginationModelChange({ ...paginationModel, page: newPage });
                                    }}
                                    rowsPerPage={paginationModel.pageSize}
                                    onRowsPerPageChange={(e) => {
                                        handlePaginationModelChange({
                                            ...paginationModel,
                                            page: 0,
                                            pageSize: parseInt(e.target.value, 10),
                                        });
                                    }}
                                    rowsPerPageOptions={[15, 30, 50, 100]}
                                    labelRowsPerPage="Show Data"
                                />
                            ),
                            toolbar: GridToolbar,
                        }}

                    />
                )}
            </Box>
            <Dialog open={openPasswordDialog} onClose={() => setOpenPasswordDialog(false)}>
                <Box p={3} minWidth={300}>
                    <Typography variant="h6" mb={2}>
                        Masukkan Password
                    </Typography>
                    <TextField
                        type="password"
                        label="Password"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handlePasswordConfirm();
                            }
                        }}
                    />
                    <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
                        <Button onClick={() => setOpenPasswordDialog(false)}>Batal</Button>
                        <Button variant="contained" onClick={handlePasswordConfirm}>
                            Konfirmasi
                        </Button>
                    </Stack>
                </Box>
            </Dialog>


        </PageContainer>
    );
}