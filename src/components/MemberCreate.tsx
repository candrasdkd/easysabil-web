import * as React from 'react';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    type Familys,
    type FormFieldValue,
    type MemberFormState,
} from '../types/Member';
import MemberForm from './MemberCreateForm';
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

export default function MemberCreate() {
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

    const INITIAL_FORM_VALUES: MemberFormState['values'] = {
        keluarga: '',
        name: '',
        date_of_birth: '',
        age: null,
        gender: '',
        education: '',
        marriage_status: '',
        is_educate: false,
    };

    const [formState, setFormState] = React.useState<MemberFormState>(() => ({
        values: INITIAL_FORM_VALUES,
        errors: {},
    }));
    const formValues = formState.values;

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
                .insert([body]);

            if (error) {
                notifications.show(`Gagal simpan data: ${error.message}`, { severity: 'error' });
            } else {
                notifications.show('Data berhasil disimpan', { severity: 'success' });
                setFormState((prev) => ({ ...prev, values: INITIAL_FORM_VALUES }));
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

    return (
        <PageContainer
            title="New Member"
            breadcrumbs={[{ title: 'Members', path: '/members' }, { title: 'New' }]}
        >
            {/* Form hanya muncul kalau password benar */}
            {showForm && (
                <MemberForm
                    date={date}
                    setDate={setDate}
                    loading={loadingKeluarga}
                    keluargaOptions={keluargaOptions}
                    uploading={isSubmitting}
                    formState={formState}
                    onFieldChange={handleFormFieldChange}
                    onSubmit={handleSubmit}
                    onReset={handleFormReset}
                    submitButtonLabel="Create"
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
                        Untuk melanjutkan membuat anggota baru, silakan masukkan password keamanan.
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
