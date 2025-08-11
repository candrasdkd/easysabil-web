import * as React from 'react';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    type Familys,
    type FormFieldValue,
    type MemberFormState,
} from '../types/Member';
import MemberEditForm from './MemberEditForm';
import PageContainer from './PageContainer';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    TextField,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { supabase } from '../supabase/client';
import { useParams } from 'react-router';

export default function MemberEdit() {
    const notifications = useNotifications();
    const [showForm, setShowForm] = React.useState(false);
    const [passwordInput, setPasswordInput] = React.useState('');
    const [openPasswordModal, setOpenPasswordModal] = React.useState(true);
    const [loadingPassword, setLoadingPassword] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [date, setDate] = React.useState<Dayjs | null>(null);
    const [keluargaOptions, setKeluargaOptions] = React.useState<Familys[]>([]);
    const [loadingKeluarga, setLoadingKeluarga] = React.useState(false);
    const [errorList, setErrorList] = React.useState<string[]>([]);
    const [openErrorModal, setOpenErrorModal] = React.useState(false);
    const { id } = useParams(); // route-mu: /members/:uuid/edit
    const [loadingDetail, setLoadingDetail] = React.useState(false);

    // optional: ubah label tombol submit bila edit
    const isEdit = Boolean(id);

    const INITIAL_FORM_VALUES: MemberFormState['values'] = {
        keluarga: '',
        name: '',
        date_of_birth: '',
        age: null,
        gender: '',
        education: '',
        marriage_status: '',
        is_educate: false,
        is_active: true, // default value
        is_duafa: false, // default value
    };

    const [formState, setFormState] = React.useState<MemberFormState>(() => ({
        values: INITIAL_FORM_VALUES,
        errors: {},
    }));
    const formValues = formState.values;

    const getMemberDetail = React.useCallback(async (memberUuid: string) => {
        setLoadingDetail(true);
        try {
            const { data, error } = await supabase
                .from('list_sensus')
                .select(
                    'uuid, name, date_of_birth, gender, level, age, marriage_status, id_family, family_name, is_educate, is_active, is_duafa'
                )
                .eq('uuid', memberUuid) // ganti ke .eq('id', ...) jika kolom primermu "id"
                .single();

            if (error) {
                notifications.show(`Gagal memuat detail: ${error.message}`, { severity: 'error' });
                return;
            }
            if (!data) {
                notifications.show('Data tidak ditemukan', { severity: 'warning' });
                return;
            }

            // set nilai form + date picker
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    keluarga: data.id_family != null ? String(data.id_family) : '',
                    name: data.name ?? '',
                    date_of_birth: data.date_of_birth ?? '',      // tetap simpan string-nya kalau kamu pakai di tempat lain
                    age: data.age ?? null,
                    gender: data.gender ?? '',
                    education: data.level ?? '',
                    marriage_status: data.marriage_status ?? '',
                    is_educate: !!data.is_educate,
                    is_active: data.is_active ?? true,
                    is_duafa: data.is_duafa ?? false,
                },
            }));
            setDate(data.date_of_birth ? dayjs(data.date_of_birth) : null);
        } finally {
            setLoadingDetail(false);
        }
    }, [notifications, setFormState, setDate]);
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
    const setFormValues = (newFormValues: Partial<MemberFormState['values']>) => {
        setFormState((prev) => ({
            ...prev,
            values: { ...prev.values, ...newFormValues },
        }));
    };

    const handleFormFieldChange = (name: keyof MemberFormState['values'], value: FormFieldValue) => {
        setFormValues({ [name]: value });
    };

    const handleFormReset = () => {
        setFormValues(INITIAL_FORM_VALUES);
    };

    const transformBody = () => {
        const selectedKeluarga = keluargaOptions.find(k => k.id === Number(formValues.keluarga));
        return {
            name: formValues.name ?? '',
            date_of_birth: date ? date.format('YYYY-MM-DD') : '',
            gender: formValues.gender ?? '',
            level: formValues.education ?? '',
            age: formValues.age ?? '',
            marriage_status: formValues.marriage_status ?? '',
            id_family: selectedKeluarga?.id ?? '',
            family_name: selectedKeluarga?.name ?? '',
            is_educate: formValues.is_educate === true,
            is_active: formValues.is_active ?? true,
            is_duafa: formValues.is_duafa ?? false,
        };
    };

    const handleErrorModalClose = () => {
        setErrorList([]);
        setOpenErrorModal(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors: string[] = [];
        if (!formValues.keluarga) errors.push("Pilih keluarga terlebih dahulu");
        if (!formValues.name?.trim()) errors.push("Nama tidak boleh kosong");
        if (!date || !dayjs(date).isValid()) errors.push("Tanggal lahir harus diisi");
        if (!formValues.gender) errors.push("Pilih jenis kelamin");
        if (!formValues.education) errors.push("Pilih jenjang pendidikan");
        if (!formValues.marriage_status) errors.push("Pilih status pernikahan");

        if (errors.length > 0) {
            setErrorList(errors);
            setOpenErrorModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const body = transformBody();
            const { error } = await supabase
                .from('list_sensus')
                .update([body])
                .eq('uuid', id);

            if (error) {
                notifications.show(`Gagal simpan data: ${error.message}`, { severity: 'error' });
            } else {
                notifications.show('Data berhasil disimpan', { severity: 'success' });
                window.history.back()
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ambil data keluarga
    React.useEffect(() => {
        const fetchKeluarga = async () => {
            setLoadingKeluarga(true);
            const { data, error } = await supabase
                .from('list_family')
                .select('id, name')
                .order('name', { ascending: true });

            if (!error) setKeluargaOptions(data || []);
            setLoadingKeluarga(false);
        };
        fetchKeluarga();
    }, []);

    React.useEffect(() => {
        if (id) void getMemberDetail(id);
    }, [id, getMemberDetail,]);


    return (
        <PageContainer
            title="Edit Data Anggota"
            breadcrumbs={[{ title: 'Members', path: '/members' }, { title: 'Edit' }]}
        >
            {/* Form hanya muncul kalau password benar */}
            {showForm && (
                <MemberEditForm
                    date={date}
                    setDate={setDate}
                    loading={loadingKeluarga || loadingDetail}
                    keluargaOptions={keluargaOptions}
                    uploading={isSubmitting}
                    formState={formState}
                    onFieldChange={handleFormFieldChange}
                    onSubmit={handleSubmit}
                    onReset={handleFormReset}
                    submitButtonLabel={isEdit ? "Update" : "Create"}
                />
            )}
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
                        Untuk melanjutkan edit data, silakan masukkan password keamanan.
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

            {/* Modal error form */}
            <Dialog open={openErrorModal} onClose={handleErrorModalClose}>
                <DialogTitle>Form Tidak Lengkap</DialogTitle>
                <DialogContent>
                    <List>
                        {errorList.map((err, idx) => (
                            <ListItem key={idx}>
                                <ListItemText primary={`• ${err}`} />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleErrorModalClose} variant="contained" color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
