// =====================================================
// TYPES — Core data model interfaces
// =====================================================

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    category: string;
    date: string; // ISO 8601
    tags?: string[];
    recurrent: boolean;
    recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'both';
    icon: string;
    color: string;
    budget?: number;
}

export interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    category: string;
    color: string;
}

export interface Budget {
    id: string;
    categoryId: string;
    month: string; // 'YYYY-MM'
    limit: number;
    spent: number;
}

export interface AppSettings {
    currency: string;
    locale: string;
    theme: 'dark' | 'light';
    monthStart: number;
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
