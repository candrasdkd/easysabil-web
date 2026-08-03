import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Family } from '../types/Member';
import type { RoleProfile } from './membersRepository';

export async function getFamiliesByRole(profile: RoleProfile): Promise<Family[]> {
    const scopedToKelompok = profile.status === 3 || profile.status === 5;
    if (scopedToKelompok && !profile.kelompok) return [];

    const familiesQuery = scopedToKelompok
        ? query(
            collection(db, 'families'),
            where('kelompok', '==', profile.kelompok),
            orderBy('name', 'asc'),
        )
        : query(collection(db, 'families'), orderBy('name', 'asc'));

    const snapshot = await getDocs(familiesQuery);
    return snapshot.docs.map((familyDocument) => {
        const data = familyDocument.data();
        return {
            id: familyDocument.id,
            name: typeof data.name === 'string' ? data.name : '',
            kelompok: typeof data.kelompok === 'string' ? data.kelompok : '',
        };
    });
}
