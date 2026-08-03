import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    type DocumentData,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import type { DataDropdown, DataOrder } from '../types/Order';

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function mapOrder(snapshot: QueryDocumentSnapshot<DocumentData>): DataOrder {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        user_name: stringValue(data.user_name),
        user_id: stringValue(data.user_id),
        id_category_order: stringValue(data.id_category_order),
        name_category: stringValue(data.name_category),
        total_order: Number(data.total_order) || 0,
        unit_price: Number(data.unit_price) || 0,
        note: typeof data.note === 'string' ? data.note : null,
        is_payment: data.is_payment === true,
        actual_price: Number(data.actual_price) || 0,
        money_holder: typeof data.money_holder === 'string' ? data.money_holder : null,
        payment_method: typeof data.payment_method === 'string' ? data.payment_method : null,
        created_at: stringValue(data.created_at) || undefined,
    };
}

export async function getOrders(categoryFilterId: string | null, showAllData: boolean): Promise<DataOrder[]> {
    const ordersQuery = categoryFilterId && !showAllData
        ? query(
            collection(db, 'orders'),
            where('id_category_order', '==', categoryFilterId),
            orderBy('created_at', 'desc'),
        )
        : query(collection(db, 'orders'), orderBy('created_at', 'desc'));

    const snapshot = await getDocs(ordersQuery);
    return snapshot.docs.map(mapOrder);
}

export async function saveOrder(
    orderData: Partial<DataOrder>,
    isUpdate: boolean,
    id?: number | string | null,
): Promise<void> {
    const cleanData = Object.fromEntries(
        Object.entries(orderData).filter(([, value]) => value !== undefined),
    );

    if (isUpdate && id != null) {
        await updateDoc(doc(db, 'orders', String(id)), cleanData);
        return;
    }

    await addDoc(collection(db, 'orders'), {
        ...cleanData,
        created_at: serverTimestamp(),
    });
}

export function removeOrder(id: number | string): Promise<void> {
    return deleteDoc(doc(db, 'orders', String(id)));
}

export function markOrderPaid(
    id: number | string,
    price: number,
    moneyHolder: string,
    paymentMethod: string,
): Promise<void> {
    return updateDoc(doc(db, 'orders', String(id)), {
        actual_price: price,
        is_payment: true,
        payment_method: paymentMethod,
        money_holder: moneyHolder,
    });
}

export async function getOrderDropdowns(): Promise<{
    members: DataDropdown[];
    categories: DataDropdown[];
}> {
    const [membersSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(query(
            collection(db, 'sensus'),
            where('kelompok', '==', 'Kelompok 1'),
            where('is_active', '==', true),
            orderBy('name', 'asc'),
        )),
        getDocs(query(collection(db, 'category_orders'), orderBy('year', 'desc'))),
    ]);

    const members = membersSnapshot.docs.map((memberDocument) => {
        const data = memberDocument.data();
        const name = stringValue(data.name);
        return { id: memberDocument.id, label: name, value: name };
    });

    const categories = categoriesSnapshot.docs.map((categoryDocument) => {
        const data = categoryDocument.data();
        const name = stringValue(data.name);
        const year = stringValue(data.year);
        const label = `${name} ${year}`.trim();
        return {
            id: categoryDocument.id,
            label,
            value: label,
            name,
            year,
            price: Number(data.price) || 0,
        };
    });

    return { members, categories };
}
