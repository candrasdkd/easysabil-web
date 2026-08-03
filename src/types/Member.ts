import type { Dayjs } from 'dayjs';

export interface Member {
    uuid: string; // Ganti dari id: number
    name: string;
    alias: string;
    gender: string;
    age: string; // atau bisa diubah ke number kalau kamu konversi, tapi sekarang string
    date_of_birth: string;
    marriage_status: string;
    level: string;
    kelompok: string;
    family_name: string;
    family_id: string;
    is_active: boolean;
    is_educate: boolean;
    is_duafa: boolean;
    created_at: string;
    order: number;
    occupation_status?: string;
    sambung_ngaji_status?: string;
}

export interface MemberFormState {
    values: {
        keluarga: string;
        name: string;
        date_of_birth: string;
        age: number | null;
        gender: string;
        education: string;
        marriage_status: string;
        is_educate: boolean; // boolean
        is_active?: boolean; // boolean
        is_duafa?: boolean; // boolean
        order?: number | null
    };
    errors: Partial<Record<keyof MemberFormState['values'], string>>;
}

export type FormFieldValue = string | number | boolean | null;
export interface MemberFormProps {
    date: Dayjs | null;
    setDate: (date: Dayjs | null) => void;
    loading: boolean;
    keluargaOptions: Family[];
    uploading: boolean;
    formState: MemberFormState;
    onFieldChange: (
        name: keyof MemberFormState['values'],
        value: FormFieldValue
    ) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onReset?: (formValues: MemberFormState['values']) => void;
    submitButtonLabel: string;
    backButtonPath?: string;
}
export interface Family {
    id: string;
    name: string;
    kelompok: string;
}
