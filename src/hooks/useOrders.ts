import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { DataOrder, DataDropdown } from '../types/Order';

export const useOrders = (categoryFilterId: string | null, showAllData: boolean) => {
    const [dataOrder, setDataOrder] = useState<DataOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchDataOrder = useCallback(async () => {
        setLoading(true);
        try {
            let q = query(collection(db, "orders"), orderBy("created_at", "desc"));
            if (categoryFilterId && !showAllData) {
                q = query(collection(db, "orders"), where("id_category_order", "==", categoryFilterId), orderBy("created_at", "desc"));
            }
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDataOrder(data as any as DataOrder[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [categoryFilterId, showAllData]);

    useEffect(() => {
        fetchDataOrder();
    }, [fetchDataOrder]);

    const saveOrder = async (orderData: Partial<DataOrder>, isUpdate: boolean, id?: number | string | null) => {
        setUploading(true);
        try {
            if (isUpdate && id) {
                const docRef = doc(db, "orders", String(id));
                // Remove undefined values to prevent Firestore errors
                const cleanData = Object.fromEntries(Object.entries(orderData).filter(([_, v]) => v !== undefined));
                await updateDoc(docRef, cleanData);
            } else {
                await addDoc(collection(db, "orders"), {
                    ...orderData,
                    created_at: new Date()
                });
            }

            await fetchDataOrder();
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            setUploading(false);
        }
    };

    const deleteOrder = async (id: number | string) => {
        setUploading(true);
        try {
            await deleteDoc(doc(db, "orders", String(id)));
            await fetchDataOrder();
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            setUploading(false);
        }
    };

    const updatePayment = async (id: number | string, price: number, moneyHolder: string = 'Fachih', paymentMethod: string = 'Cash') => {
        setUploading(true);
        try {
            const docRef = doc(db, "orders", String(id));
            await updateDoc(docRef, {
                actual_price: price,
                is_payment: true,
                payment_method: paymentMethod,
                money_holder: moneyHolder
            });

            await fetchDataOrder();
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            setUploading(false);
        }
    };

    return {
        dataOrder,
        loading,
        error,
        uploading,
        fetchDataOrder,
        saveOrder,
        deleteOrder,
        updatePayment
    };
};

export const useOrderDropdowns = () => {
    const [dataDropdownSensus, setDataDropdownSensus] = useState<DataDropdown[]>([]);
    const [dataDropdownCategory, setDataDropdownCategory] = useState<DataDropdown[]>([]);

    const fetchDropdowns = useCallback(async () => {
        try {
            const sensusQuery = query(collection(db, "sensus"), orderBy("name", "asc"));
            const catQuery = query(collection(db, "category_orders"), orderBy("year", "desc"));

            const [sensusSnap, catSnap] = await Promise.all([
                getDocs(sensusQuery),
                getDocs(catQuery)
            ]);

            const sensusData = sensusSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            const catData = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            setDataDropdownSensus(sensusData.map(i => ({ label: i.name || '', value: i.name || '', id: i.id })));
            setDataDropdownCategory(catData.map(i => ({
                ...i, label: `${i.name} ${i.year}`, value: `${i.name} ${i.year}`, id: i.id
            })));
        } catch (error) {
            console.error("Error fetching dropdowns", error);
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    return { dataDropdownSensus, dataDropdownCategory };
};
