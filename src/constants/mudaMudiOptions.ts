export const MUDA_MUDI_LEVELS = ['Pra Remaja', 'Remaja', 'Pra Nikah'] as const;

export const OCCUPATION_STATUS_OPTIONS = [
    'Pelajar/Mahasiswa',
    'Bekerja',
    'Belum Bekerja'
] as const;

export const SAMBUNG_NGAJI_STATUS_OPTIONS = [
    'Lancar',
    'Kurang Lancar',
    'Tidak Lancar'
] as const;

export type OccupationStatus = typeof OCCUPATION_STATUS_OPTIONS[number];
export type SambungNgajiStatus = typeof SAMBUNG_NGAJI_STATUS_OPTIONS[number];

export interface MudaMudiInfo {
    occupation_status?: OccupationStatus | string;
    sambung_ngaji_status?: SambungNgajiStatus | string;
    updated_at?: Timestamp;
    updated_by?: string;
}

/**
 * Super Admin (0), Admin (1), PM Desa (4), PM Kelompok (5) have access to Muda/i fields
 */
export const isMudaMudiRole = (status?: number): boolean => {
    return status !== undefined && [0, 1, 4, 5].includes(status);
};

/**
 * Check if a member level is a Muda/i level ('Pra Remaja', 'Remaja', 'Pra Nikah')
 */
export const isMudaMudiLevel = (level?: string): boolean => {
    if (!level) return false;
    return MUDA_MUDI_LEVELS.some(l => l.toLowerCase() === level.trim().toLowerCase());
};

/**
 * Generate slug for kelompok doc ID
 * e.g., "Kelompok 3" -> "kelompok-3"
 */
export const getKelompokSlug = (kelompokName: string): string => {
    return kelompokName.trim().toLowerCase().replace(/\s+/g, '-');
};
import type { Timestamp } from 'firebase/firestore';
