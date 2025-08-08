import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent, type SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';
import dayjs, { Dayjs } from 'dayjs';
import type { Member } from '../types/Member';

export interface EmployeeFormState {
    values: Partial<Omit<Member, 'id'>>;
    errors: Partial<Record<keyof EmployeeFormState['values'], string>>;
}

export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface EmployeeFormProps {
    formState: EmployeeFormState;
    onFieldChange: (
        name: keyof EmployeeFormState['values'],
        value: FormFieldValue,
    ) => void;
    onSubmit: (formValues: Partial<EmployeeFormState['values']>) => Promise<void>;
    onReset?: (formValues: Partial<EmployeeFormState['values']>) => void;
    submitButtonLabel: string;
    backButtonPath?: string;
}

export default function MemberForm(props: EmployeeFormProps) {
    const {
        formState,
        onFieldChange,
        onSubmit,
        onReset,
        submitButtonLabel,
        backButtonPath,
    } = props;

    const formValues = formState.values;
    const formErrors = formState.errors;

    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = React.useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            setIsSubmitting(true);
            try {
                await onSubmit(formValues);
            } finally {
                setIsSubmitting(false);
            }
        },
        [formValues, onSubmit],
    );

    const handleTextFieldChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            onFieldChange(
                event.target.name as keyof EmployeeFormState['values'],
                event.target.value,
            );
        },
        [onFieldChange],
    );

    const handleNumberFieldChange = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            onFieldChange(
                event.target.name as keyof EmployeeFormState['values'],
                Number(event.target.value),
            );
        },
        [onFieldChange],
    );

    const handleDateFieldChange = React.useCallback(
        (fieldName: keyof EmployeeFormState['values']) => (value: Dayjs | null) => {
            if (value?.isValid()) {
                onFieldChange(fieldName, value.toISOString() ?? null);
            } else if (formValues[fieldName]) {
                onFieldChange(fieldName, null);
            }
        },
        [formValues, onFieldChange],
    );

    const handleSelectFieldChange = React.useCallback(
        (event: SelectChangeEvent) => {
            onFieldChange(
                event.target.name as keyof EmployeeFormState['values'],
                event.target.value,
            );
        },
        [onFieldChange],
    );

    const handleReset = React.useCallback(() => {
        if (onReset) {
            onReset(formValues);
        }
    }, [formValues, onReset]);

    const handleBack = React.useCallback(() => {
        navigate(backButtonPath ?? '/members');
    }, [navigate, backButtonPath]);

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            autoComplete="off"
            onReset={handleReset}
            sx={{ width: '100%' }}
        >
            <FormGroup>
                <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <TextField
                            value={formValues.name ?? ''}
                            onChange={handleTextFieldChange}
                            name="name"
                            label="Name"
                            error={!!formErrors.name}
                            helperText={formErrors.name ?? ' '}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <TextField
                            type="number"
                            value={formValues.age ?? ''}
                            onChange={handleNumberFieldChange}
                            name="age"
                            label="Age"
                            error={!!formErrors.age}
                            helperText={formErrors.age ?? ' '}
                            fullWidth
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                value={formValues.date_of_birth ? dayjs(formValues.date_of_birth) : null}
                                onChange={handleDateFieldChange('date_of_birth')}
                                name="date_of_birth"
                                label="Date of Birth"
                                slotProps={{
                                    textField: {
                                        error: !!formErrors.date_of_birth,
                                        helperText: formErrors.date_of_birth ?? ' ',
                                        fullWidth: true,
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <FormControl error={!!formErrors.marriage_status} fullWidth>
                            <InputLabel id="employee-role-label">Marriage Status</InputLabel>
                            <Select
                                value={formValues.marriage_status ?? ''}
                                onChange={handleSelectFieldChange as SelectProps['onChange']}
                                labelId="employee-role-label"
                                name="role"
                                label="Department"
                                defaultValue=""
                                fullWidth
                            >
                                <MenuItem value="Market">Market</MenuItem>
                                <MenuItem value="Finance">Finance</MenuItem>
                                <MenuItem value="Development">Development</MenuItem>
                            </Select>
                            {/* <FormHelperText>{formErrors.role ?? ' '}</FormHelperText> */}
                        </FormControl>
                    </Grid>
                    {/* <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <FormControl>
                            <FormControlLabel
                                name="isFullTime"
                                control={
                                    <Checkbox
                                        size="large"
                                        checked={formValues.isFullTime ?? false}
                                        onChange={handleCheckboxFieldChange}
                                    />
                                }
                                label="Full-time"
                            />
                            <FormHelperText error={!!formErrors.isFullTime}>
                                {formErrors.isFullTime ?? ' '}
                            </FormHelperText>
                        </FormControl>
                    </Grid> */}
                </Grid>
            </FormGroup>
            <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button
                    variant="contained"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                >
                    Back
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    loading={isSubmitting}
                >
                    {submitButtonLabel}
                </Button>
            </Stack>
        </Box>
    );
}