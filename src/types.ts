// =====================================================
// TYPES — Core data model interfaces
// =====================================================

export interface Transaction {
    id: string;
    user_id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    categoryId: string;
    date: string; // ISO 8601
    recurrent: boolean;
    recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    user_id: string;
    name: string;
    type: 'income' | 'expense' | 'both';
    icon: string;
    color: string;
    budget?: number;
    createdAt?: string;
}

export interface Goal {
    id: string;
    user_id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    categoryId: string;
    color: string;
    createdAt?: string;
}

export interface Budget {
    id: string;
    user_id: string;
    categoryId: string;
    month: string; // 'YYYY-MM'
    limit: number;
    spent: number;
    createdAt?: string;
}

export interface AppSettings {
    currency: string;
    locale: string;
    theme: 'dark' | 'light';
    monthStart: number;
    paymentMethods: string[];
}

export type PageName =
    | 'dashboard'
    | 'transactions'
    | 'add'
    | 'budgets'
    | 'goals'
    | 'reports'
    | 'settings';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}
