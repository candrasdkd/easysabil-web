import { Autocomplete, Box, Button, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, MenuItem, Select, Stack, Switch, TextField } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from "dayjs";
import type { MemberFormProps } from "../types/Member";

export default function MemberForm(props: MemberFormProps) {
    const {
        date,
        setDate,
        keluargaOptions,
        loading,
        uploading,
        formState,
        onFieldChange,
        onSubmit,
        onReset,
        submitButtonLabel,
        backButtonPath
    } = props;
    const { values: formValues, errors: formErrors } = formState;
    const navigate = useNavigate();
    React.useEffect(() => {
        if (date) {
            const dobDayjs = dayjs(date);
            if (dobDayjs.isValid()) {
                onFieldChange('age', `${dayjs().diff(dobDayjs, 'year')} Tahun`);
            }
        }
    }, [date]);


    const handleBack = () => {
        navigate(backButtonPath ?? '/members');
    };

    return (
        <Box
            component="form"
            onSubmit={onSubmit}
            noValidate
            autoComplete="off"
            onReset={() => onReset?.(formValues)}
            sx={{ width: '100%' }}
        >
            <FormGroup>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {/* Dropdown Keluarga (Supabase) */}
                    <Grid size={{ xs: 12, sm: 6 }} mb={-3}>
                        <FormControl fullWidth error={!!formErrors.keluarga}>
                            <Autocomplete
                                loading={true}
                                disabled={uploading || loading}
                                fullWidth
                                options={keluargaOptions}
                                getOptionLabel={(option) => option.name}
                                value={
                                    keluargaOptions.find((opt) => opt.id === Number(formValues.keluarga)) || null
                                }
                                onChange={(_, newValue) =>
                                    onFieldChange("keluarga", newValue ? newValue.id : "")
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Pilih dari Keluarga Mana"
                                        error={!!formErrors.keluarga}
                                        helperText={formErrors.keluarga ?? " "}
                                    />
                                )}
                            />
                        </FormControl>
                    </Grid>

                    {/* Input Nama */}
                    <Grid size={{ xs: 12, sm: 6 }} mb={-3}>
                        <TextField
                            disabled={uploading}
                            value={formValues.name ?? ''}
                            onChange={(e) => onFieldChange('name', e.target.value)}
                            name="name"
                            label="Masukkan Nama"
                            error={!!formErrors.name}
                            helperText={formErrors.name ?? ' '}
                            fullWidth
                        />
                    </Grid>

                    {/* Input Tanggal Lahir */}
                    <Grid size={{ xs: 12, sm: 6 }} mb={-3}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                disabled={uploading}
                                value={dayjs(date)}
                                format="DD MMMM YYYY"
                                onChange={(value) => setDate(value)}
                                label="Pilih Tanggal Lahir"
                                slotProps={{
                                    textField: {
                                        error: !!formErrors.date_of_birth,
                                        helperText: formErrors.date_of_birth ?? ' ',
                                        fullWidth: true
                                    }
                                }}
                            />

                        </LocalizationProvider>
                    </Grid>

                    {/* Usia (Disabled) */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            value={formValues.age ?? ''}
                            label="Usia Akan Otomatis"
                            disabled
                            fullWidth
                        />
                    </Grid>

                    {/* Dropdown Jenis Kelamin */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth error={!!formErrors.gender} disabled={uploading}>
                            <InputLabel>Pilih Jenis Kelamin</InputLabel>
                            <Select
                                value={formValues.gender ?? ''}
                                onChange={(e) => onFieldChange('gender', e.target.value)}
                                label="Pilih Jenis Kelamin"
                            >
                                <MenuItem value="Laki - Laki">Laki - Laki</MenuItem>
                                <MenuItem value="Perempuan">Perempuan</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Dropdown Jenjang Pendidikan */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth error={!!formErrors.education} disabled={uploading}>
                            <InputLabel>Pilih Jenjang</InputLabel>
                            <Select
                                value={formValues.education ?? ''}
                                onChange={(e) => onFieldChange('education', e.target.value)}
                                label="Pilih Jenjang"
                            >
                                <MenuItem value="Balita">Balita (0-5 Tahun)</MenuItem>
                                <MenuItem value="Cabe Rawit">Cabe Rawit (5-12 Tahun)</MenuItem>
                                <MenuItem value="Pra Remaja">Pra Remaja (12-15 Tahun)</MenuItem>
                                <MenuItem value="Remaja">Remaja (15-19 Tahun)</MenuItem>
                                <MenuItem value="Pra Nikah">Pra Nikah (19-30 Tahun)</MenuItem>
                                <MenuItem value="Dewasa">Dewasa (Sudah Menikah / 30-60 Tahun)</MenuItem>
                                <MenuItem value="Lansia">Lansia (70+ Tahun)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Dropdown Status Pernikahan */}
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth error={!!formErrors.marriage_status} disabled={uploading}>
                            <InputLabel>Pilih Status Pernikahan</InputLabel>
                            <Select
                                value={formValues.marriage_status ?? ''}
                                onChange={(e) =>
                                    onFieldChange('marriage_status', e.target.value)
                                }
                                label="Pilih Status Pernikahan"
                            >
                                <MenuItem value="Belum Menikah">Belum Menikah</MenuItem>
                                <MenuItem value="Menikah">Menikah</MenuItem>
                                <MenuItem value="Janda">Janda</MenuItem>
                                <MenuItem value="Duda">Duda</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    {/* Switch Sedang Binaan */}
                    <Grid size={{ xs: 12, sm: 6 }} display="flex" alignItems="center">
                        <FormControlLabel
                            disabled={uploading}
                            control={
                                <Switch
                                    checked={formValues.is_educate === true}
                                    onChange={(e) => onFieldChange('is_educate', e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Sedang Binaan?"
                        />
                    </Grid>


                </Grid>
            </FormGroup>

            <Stack
                direction={{ xs: 'row' }}
                spacing={2}
                justifyContent="space-between"
            >
                <Button
                    variant="contained"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    disabled={uploading}
                >
                    Kembali
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={uploading}
                >
                    {uploading ? 'Menyimpan...' : submitButtonLabel}
                </Button>
            </Stack>
        </Box>
    );
}
