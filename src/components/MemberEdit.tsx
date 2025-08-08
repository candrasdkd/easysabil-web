import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate, useParams } from 'react-router';
import useNotifications from '../hooks/useNotifications/useNotifications';
import {
    getOne as getEmployee,
    updateOne as updateEmployee,
    type Member,
} from '../types/Member';
import EmployeeForm, {
    type FormFieldValue,
    type EmployeeFormState,
} from './MemberForm';
import PageContainer from './PageContainer';

function MemberEditForm({
    initialValues,
    onSubmit,
}: {
    initialValues: Partial<EmployeeFormState['values']>;
    onSubmit: (formValues: Partial<EmployeeFormState['values']>) => Promise<void>;
}) {
    const { id } = useParams();
    const navigate = useNavigate();

    const notifications = useNotifications();

    const [formState, setFormState] = React.useState<EmployeeFormState>(() => ({
        values: initialValues,
        errors: {},
    }));
    const formValues = formState.values;
    const formErrors = formState.errors;

    const setFormValues = React.useCallback(
        (newFormValues: Partial<EmployeeFormState['values']>) => {
            setFormState((previousState) => ({
                ...previousState,
                values: newFormValues,
            }));
        },
        [],
    );

    const setFormErrors = React.useCallback(
        (newFormErrors: Partial<EmployeeFormState['errors']>) => {
            setFormState((previousState) => ({
                ...previousState,
                errors: newFormErrors,
            }));
        },
        [],
    );

    const handleFormFieldChange = React.useCallback(
        (name: keyof EmployeeFormState['values'], value: FormFieldValue) => {
            // const validateField = async (values: Partial<EmployeeFormState['values']>) => {
            //     const { issues } = validateEmployee(values);
            //     setFormErrors({
            //         ...formErrors,
            //         [name]: issues?.find((issue) => issue.path?.[0] === name)?.message,
            //     });
            // };

            const newFormValues = { ...formValues, [name]: value };

            setFormValues(newFormValues);
            // validateField(newFormValues);
        },
        [formValues, formErrors, setFormErrors, setFormValues],
    );

    const handleFormReset = React.useCallback(() => {
        setFormValues(initialValues);
    }, [initialValues, setFormValues]);

    const handleFormSubmit = React.useCallback(async () => {
        // const { issues } = validateEmployee(formValues);
        // if (issues && issues.length > 0) {
        //     setFormErrors(
        //         Object.fromEntries(issues.map((issue) => [issue.path?.[0], issue.message])),
        //     );
        //     return;
        // }
        setFormErrors({});

        try {
            await onSubmit(formValues);
            notifications.show('Employee edited successfully.', {
                severity: 'success',
                autoHideDuration: 3000,
            });

            navigate('/members');
        } catch (editError) {
            notifications.show(
                `Failed to edit employee. Reason: ${(editError as Error).message}`,
                {
                    severity: 'error',
                    autoHideDuration: 3000,
                },
            );
            throw editError;
        }
    }, [formValues, navigate, notifications, onSubmit, setFormErrors]);

    return (
        <EmployeeForm
            formState={formState}
            onFieldChange={handleFormFieldChange}
            onSubmit={handleFormSubmit}
            onReset={handleFormReset}
            submitButtonLabel="Save"
            backButtonPath={`/members/${id}`}
        />
    );
}

export default function MemberEdit() {
    const { id } = useParams();

    const [employee, setEmployee] = React.useState<Member | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const loadData = React.useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            const showData = await getEmployee(id as string);

            setEmployee(showData);
        } catch (showDataError) {
            setError(showDataError as Error);
        }
        setIsLoading(false);
    }, [id]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = React.useCallback(
        async (formValues: Partial<EmployeeFormState['values']>) => {
            const updatedData = await updateEmployee(id as string, formValues);
            setEmployee(updatedData);
        },
        [id],
    );

    const renderEdit = React.useMemo(() => {
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

        return employee ? (
            <MemberEditForm initialValues={employee} onSubmit={handleSubmit} />
        ) : null;
    }, [isLoading, error, employee, handleSubmit]);

    return (
        <PageContainer
            title={`Edit Member ${id}`}
            breadcrumbs={[
                { title: 'Members', path: '/members' },
                { title: `Member ${id}`, path: `/members/${id}` },
                { title: 'Edit' },
            ]}
        >
            <Box sx={{ display: 'flex', flex: 1 }}>{renderEdit}</Box>
        </PageContainer>
    );
}