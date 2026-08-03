export type SelectedCategoryProps = {
    label: string;
    value: string;
    id: string;
    name: string;
    price: string;
    year?: string | number;
};

export type DataDropdown = {
    label: string;
    value: string;
    id: string | number;
    name?: string;
    price?: number | string;
    year?: number | string;
};

export type DataOrder = {
    id: number | string;
    user_name: string;
    user_id: string;
    id_category_order: number | string;
    name_category: string;
    total_order: number;
    unit_price: number;
    note?: string | null;
    is_payment: boolean;
    actual_price: number;
    money_holder?: string | null;
    payment_method?: string | null;
    created_at?: string;
};

export interface OrderCategory {
    id: string;
    name: string;
    price: number;
    year: number;
}

export interface OrderCategoryInput {
    name: string;
    price: number;
    year: number;
}

export interface OrderFormData {
    idCard: number | string | null;
    user: DataDropdown;
    category: SelectedCategoryProps;
    totalOrder: string;
    note: string;
    isPayment: boolean;
    moneyHolder: string;
    paymentMethod: string;
    actualPrice: string;
}
