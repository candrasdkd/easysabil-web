import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
    type DocumentData,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Member } from '../types/Member';
import type { UserProfile } from '../types/auth';

const MUDA_LEVELS = new Set(['Pra Nikah', 'Pra Remaja', 'Remaja']);
const ALL_MEMBERS_ROLES = new Set([0, 1, 2, 4]);
const MUDA_ROLES = new Set([4, 5]);

export type RoleProfile = Pick<UserProfile, 'status'> & Partial<Pick<UserProfile, 'kelompok'>>;

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function booleanValue(value: unknown): boolean {
    return value === true;
}

function mapMember(snapshot: QueryDocumentSnapshot<DocumentData>): Member {
    const data = snapshot.data();
    return {
        uuid: snapshot.id,
        name: stringValue(data.name),
        alias: stringValue(data.alias),
        gender: stringValue(data.gender),
        age: stringValue(data.age),
        date_of_birth: stringValue(data.date_of_birth),
        marriage_status: stringValue(data.marriage_status),
        level: stringValue(data.level),
        kelompok: stringValue(data.kelompok),
        family_name: stringValue(data.family_name),
        family_id: stringValue(data.family_id),
        is_active: booleanValue(data.is_active),
        is_educate: booleanValue(data.is_educate),
        is_duafa: booleanValue(data.is_duafa),
        created_at: stringValue(data.created_at),
        order: Number(data.order) || 0,
        occupation_status: stringValue(data.occupation_status) || undefined,
        sambung_ngaji_status: stringValue(data.sambung_ngaji_status) || undefined,
    };
}

async function fetchBaseMembers(profile: RoleProfile): Promise<Member[]> {
    const scopedToKelompok = profile.status === 3 || profile.status === 5;
    if (scopedToKelompok && !profile.kelompok) return [];

    const membersQuery = scopedToKelompok
        ? query(
            collection(db, 'sensus'),
            where('kelompok', '==', profile.kelompok),
            orderBy('name', 'asc'),
        )
        : query(collection(db, 'sensus'), orderBy('name', 'asc'));

    const snapshot = await getDocs(membersQuery);
    return snapshot.docs.map(mapMember);
}

async function enrichMudaMember(member: Member): Promise<Member> {
    if (member.occupation_status || member.sambung_ngaji_status) return member;

    try {
        const snapshot = await getDoc(doc(db, 'sensus', member.uuid, 'muda_mudi_info', 'detail'));
        if (!snapshot.exists()) return member;
        const data = snapshot.data();
        return {
            ...member,
            occupation_status: stringValue(data.occupation_status),
            sambung_ngaji_status: stringValue(data.sambung_ngaji_status),
        };
    } catch (error) {
        console.error(`Gagal mengambil data muda/i untuk ${member.uuid}:`, error);
        return member;
    }
}

export async function getActiveMembers(): Promise<Member[]> {
    const snapshot = await getDocs(
        query(collection(db, 'sensus'), where('is_active', '==', true)),
    );
    return snapshot.docs.map(mapMember);
}

export async function getMembersByRole(profile: RoleProfile): Promise<Member[]> {
    if (!ALL_MEMBERS_ROLES.has(profile.status) && profile.status !== 3 && profile.status !== 5) {
        return [];
    }

    let members = await fetchBaseMembers(profile);
    if (!MUDA_ROLES.has(profile.status)) return members;

    members = members.filter((member) => MUDA_LEVELS.has(member.level));
    return Promise.all(members.map(enrichMudaMember));
}
