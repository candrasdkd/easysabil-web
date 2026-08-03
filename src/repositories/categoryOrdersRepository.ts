import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { OrderCategory, OrderCategoryInput } from '../types/Order';

export async function getOrderCategories(): Promise<OrderCategory[]> {
    const snapshot = await getDocs(
        query(collection(db, 'category_orders'), orderBy('year', 'desc')),
    );

    return snapshot.docs.map((categoryDocument) => {
        const data = categoryDocument.data();
        return {
            id: categoryDocument.id,
            name: typeof data.name === 'string' ? data.name : '',
            year: Number(data.year) || 0,
            price: Number(data.price) || 0,
        };
    });
}

export async function saveOrderCategory(data: OrderCategoryInput, id?: string): Promise<void> {
    const payload = { name: data.name, price: data.price, year: data.year };
    if (id) {
        await updateDoc(doc(db, 'category_orders', id), payload);
        return;
    }
    await addDoc(collection(db, 'category_orders'), payload);
}

export function removeOrderCategory(id: string): Promise<void> {
    return deleteDoc(doc(db, 'category_orders', id));
}
