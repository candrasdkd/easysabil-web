import { useMemo } from 'react';
import type { DataOrder } from '../types/Order';

const MONEY_HOLDERS = ['Sutoyo', 'Riko', 'Candra', 'Fahmi', 'Fachih'];

export const useOrderStats = (filteredOrder: DataOrder[]) => {
    return useMemo(() => {
        const totalItems = filteredOrder.reduce((acc, curr) => acc + curr.total_order, 0);
        const paidOrders = filteredOrder.filter(item => item.is_payment).length;
        const totalValue = filteredOrder.reduce((acc, curr) => acc + (curr.unit_price * curr.total_order), 0);
        const totalReceived = filteredOrder.reduce((acc, curr) => acc + (curr.actual_price || 0), 0);

        const holders: Record<string, number> = {};
        MONEY_HOLDERS.forEach(h => holders[h] = 0);

        const methods: Record<string, number> = { 'Cash': 0, 'Transfer': 0 };

        filteredOrder.forEach(order => {
            if (order.is_payment && order.actual_price > 0) {
                if (order.money_holder) holders[order.money_holder] = (holders[order.money_holder] || 0) + order.actual_price;
                if (order.payment_method) methods[order.payment_method] = (methods[order.payment_method] || 0) + order.actual_price;
            }
        });

        return {
            totalItems,
            paidOrders,
            unpaidOrders: filteredOrder.length - paidOrders,
            paymentRate: filteredOrder.length > 0 ? (paidOrders / filteredOrder.length) * 100 : 0,
            totalValue,
            totalReceived,
            gap: totalValue - totalReceived,
            holders,
            methods
        };
    }, [filteredOrder]);
};
