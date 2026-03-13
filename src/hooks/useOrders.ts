import { useEffect, useCallback } from 'react';
import { useOrdersStore, useOrderDropdownsStore } from '../store/ordersStore';

export const useOrders = (categoryFilterId: string | null, showAllData: boolean) => {
    const { orders: dataOrder, loading, uploading, error, isInitialized, fetchOrders, saveOrder, deleteOrder, updatePayment } = useOrdersStore();

    const fetchDataOrder = useCallback(() => {
        return fetchOrders(categoryFilterId, showAllData);
    }, [categoryFilterId, showAllData, fetchOrders]);

    useEffect(() => {
        fetchDataOrder();
    }, [fetchDataOrder]);

    return {
        dataOrder,
        loading: !isInitialized && loading,
        error,
        uploading,
        fetchDataOrder,
        saveOrder,
        deleteOrder,
        updatePayment
    };
};

export const useOrderDropdowns = () => {
    const { dataDropdownSensus, dataDropdownCategory, fetchDropdowns } = useOrderDropdownsStore();

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    return { dataDropdownSensus, dataDropdownCategory };
};
