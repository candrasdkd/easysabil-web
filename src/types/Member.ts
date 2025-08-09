import type { GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import type { Dayjs } from 'dayjs';

export interface Member {
    uuid: string; // Ganti dari id: number
    name: string;
    gender: string;
    age: string; // atau bisa diubah ke number kalau kamu konversi, tapi sekarang string
    date_of_birth: string;
    marriage_status: string;
    level: string;
    kelompok: string;
    family_name: string;
    id_family: number;
    is_active: boolean;
    is_educate: boolean;
    is_duafa: boolean;
    created_at: string;
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
    };
    errors: Partial<Record<keyof MemberFormState['values'], string>>;
}

export type FormFieldValue = string | number | boolean | null;
export interface MemberFormProps {
    date: Dayjs | null;
    setDate: (date: Dayjs | null) => void;
    loading: boolean;
    keluargaOptions: Familys[];
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
export interface Familys {
    id: number; // Ganti dari id: number
    name: string;
}

export function getMembersStore(): Member[] {
    const stringifiedEmployees = localStorage.getItem('members-store');
    return stringifiedEmployees ? JSON.parse(stringifiedEmployees) : [];
}

export function setMembersStore(members: Member[]) {
    return localStorage.setItem('members-store', JSON.stringify(members));
}

export async function getMany({
    paginationModel,
    filterModel,
    sortModel,
}: {
    paginationModel: GridPaginationModel;
    sortModel: GridSortModel;
    filterModel: GridFilterModel;
}): Promise<{ items: Member[]; itemCount: number }> {
    const employeesStore = getMembersStore();

    let filteredEmployees = [...employeesStore];

    // Apply filters (example only)
    if (filterModel?.items?.length) {
        filterModel.items.forEach(({ field, value, operator }) => {
            if (!field || value == null) {
                return;
            }

            filteredEmployees = filteredEmployees.filter((employee) => {
                const employeeValue = employee[field as keyof Member];

                switch (operator) {
                    case 'contains':
                        return String(employeeValue).toLowerCase().includes(String(value).toLowerCase());
                    case 'equals':
                        return employeeValue === value;
                    case 'startsWith':
                        return String(employeeValue).toLowerCase().startsWith(String(value).toLowerCase());
                    case 'endsWith':
                        return String(employeeValue).toLowerCase().endsWith(String(value).toLowerCase());
                    case '>':
                        return employeeValue > value;
                    case '<':
                        return employeeValue < value;
                    default:
                        return true;
                }
            });
        });
    }

    // Apply sorting
    if (sortModel?.length) {
        filteredEmployees.sort((a, b) => {
            for (const { field, sort } of sortModel) {
                if (a[field as keyof Member] < b[field as keyof Member]) {
                    return sort === 'asc' ? -1 : 1;
                }
                if (a[field as keyof Member] > b[field as keyof Member]) {
                    return sort === 'asc' ? 1 : -1;
                }
            }
            return 0;
        });
    }

    // Apply pagination
    const start = paginationModel.page * paginationModel.pageSize;
    const end = start + paginationModel.pageSize;
    const paginatedEmployees = filteredEmployees.slice(start, end);

    return {
        items: paginatedEmployees,
        itemCount: filteredEmployees.length,
    };
}

export async function getOne(employeeId: string) {
    const employeesStore = getMembersStore();

    const employeeToShow = employeesStore.find((member) => member.uuid === employeeId);

    if (!employeeToShow) {
        throw new Error('Employee not found');
    }
    return employeeToShow;
}

export async function createOne(data: Omit<Member, 'id'>) {
    const employeesStore = getMembersStore();

    const newEmployee = {
        ...data,
    };

    setMembersStore([...employeesStore, newEmployee]);

    return newEmployee;
}


export async function updateOne(memberID: string, data: Partial<Omit<Member, 'id'>>) {
    const employeesStore = getMembersStore();

    let updatedEmployee: Member | null = null;

    setMembersStore(
        employeesStore.map((member) => {
            if (member.uuid === memberID) {
                updatedEmployee = { ...member, ...data };
                return updatedEmployee;
            }
            return member;
        }),
    );

    if (!updatedEmployee) {
        throw new Error('Employee not found');
    }
    return updatedEmployee;
}

export async function deleteOne(memberID: string) {
    const employeesStore = getMembersStore();

    setMembersStore(employeesStore.filter((member) => member.uuid !== memberID));
}
