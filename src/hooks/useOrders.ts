import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabase/client';
import type { DataOrder, DataDropdown } from '../types/Order';

export const useOrders = (categoryFilterId: string | null, showAllData: boolean) => {
    const [dataOrder, setDataOrder] = useState<DataOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchDataOrder = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from("list_order").select("*").order("created_at", { ascending: false });
            if (categoryFilterId && !showAllData) {
                query = query.eq("id_category_order", categoryFilterId);
            }
            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setDataOrder((data as DataOrder[]) || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, [categoryFilterId, showAllData]);

    useEffect(() => {
        fetchDataOrder();
    }, [fetchDataOrder]);

    const saveOrder = async (orderData: Partial<DataOrder>, isUpdate: boolean, id?: number | null) => {
        setUploading(true);
        try {
            const query = isUpdate
                ? supabase.from("list_order").update(orderData).eq("id", id)
                : supabase.from("list_order").insert([orderData]);

            const { error: saveError } = await query;
            if (saveError) throw saveError;

            await fetchDataOrder();
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            setUploading(false);
        }
    };

    const deleteOrder = async (id: number) => {
        setUploading(true);
        try {
            const { error: deleteError } = await supabase.from("list_order").delete().eq("id", id);
            if (deleteError) throw deleteError;
            await fetchDataOrder();
            return { success: true };
        } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        } finally {
            setUploading(false);
        }
    };

    const updatePayment = async (id: number, price: number) => {
        setUploading(true);
        try {
            const { error: updateError } = await supabase.from("list_order")
                .update({
                    actual_price: price,
                    is_payment: true,
                    payment_method: 'Cash',
                    money_holder: 'Fachih'
                })
                .eq("id", id);

            if (updateError) throw updateError;
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
        const [sensusRes, catRes] = await Promise.all([
            supabase.from("list_sensus").select("uuid,name").order("name", { ascending: true }),
            supabase.from("category_order").select("*").order("year", { ascending: false })
        ]);

        if (!sensusRes.error) {
            setDataDropdownSensus(sensusRes.data.map(i => ({ label: i.name, value: i.name, id: i.uuid })));
        }
        if (!catRes.error) {
            setDataDropdownCategory(catRes.data.map(i => ({
                ...i, label: `${i.name} ${i.year}`, value: `${i.name} ${i.year}`, id: i.id
            })));
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    return { dataDropdownSensus, dataDropdownCategory };
};
