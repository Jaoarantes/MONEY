// =====================================================
// HOOKS — Supabase SQL Persistence Layer
// =====================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
    subMonths, startOfMonth, endOfMonth,
    parseISO, isWithinInterval
} from 'date-fns';
import type {
    Transaction, Category, Goal, Budget,
    AppSettings, ToastMessage
} from './types';
import { getMonthKey } from './utils';

// =====================================================
// MAPPERS — SQL (snake_case) to TS (camelCase)
// =====================================================

const mapTransaction = (sql: any): Transaction => ({
    ...sql,
    createdAt: sql.created_at,
    updatedAt: sql.updated_at
});

const mapCategory = (sql: any): Category => ({
    ...sql,
    createdAt: sql.created_at
});

const mapGoal = (sql: any): Goal => ({
    ...sql,
    createdAt: sql.created_at
});

const mapBudget = (sql: any): Budget => ({
    ...sql,
    createdAt: sql.created_at
});

// =====================================================
// useToast — notification system
// =====================================================

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastMessage['type'], message: string) => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000); // Extended to 5s for better visibility
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}

// =====================================================
// useSettings — app settings management (LocalStorage)
// =====================================================

export function useSettings() {
    const [storedSettings, setStoredSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem('app-settings');
        return stored ? JSON.parse(stored) : {
            currency: 'BRL',
            locale: 'pt-BR',
            theme: 'dark',
            monthStart: 1,
            paymentMethods: ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'TED', 'Boleto']
        };
    });

    const setSettings = useCallback((val: AppSettings | ((prev: AppSettings) => AppSettings)) => {
        setStoredSettings(prev => {
            const next = typeof val === 'function' ? (val as any)(prev) : val;
            localStorage.setItem('app-settings', JSON.stringify(next));
            return next;
        });
    }, []);

    const settings = {
        ...storedSettings,
        paymentMethods: storedSettings.paymentMethods || ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'TED', 'Boleto']
    };

    const toggleTheme = useCallback(() => {
        setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
        }));
    }, [setSettings]);

    return { settings, setSettings, toggleTheme };
}

// =====================================================
// useCategories — CRUD for categories (Supabase)
// =====================================================

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) console.error('Error fetching categories:', error);
        if (data) setCategories(data.map(mapCategory));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = useCallback(async (cat: Omit<Category, 'id' | 'user_id'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('categories')
            .insert([{ ...cat, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error adding category:', error);
            return null;
        }

        const mapped = mapCategory(data);
        setCategories(prev => [...prev, mapped]);
        return mapped;
    }, []);

    const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating category:', error);
            return;
        }

        const mapped = mapCategory(data);
        setCategories(prev => prev.map(c => c.id === id ? mapped : c));
    }, []);

    const deleteCategory = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting category:', error);
        else setCategories(prev => prev.filter(c => c.id !== id));
    }, []);

    const seedInitialCategories = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { DEFAULT_CATEGORIES } = await import('./seedData');
        const newCats = DEFAULT_CATEGORIES.map(c => ({
            user_id: user.id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
            budget: c.budget
        }));

        const { data, error } = await supabase
            .from('categories')
            .insert(newCats)
            .select();

        if (!error && data) {
            setCategories(data.map(mapCategory));
        } else if (error) {
            console.error('Error seeding categories:', error);
        }
    }, [setCategories]);

    return { categories, loading, addCategory, updateCategory, deleteCategory, setCategories, seedInitialCategories };
}

// =====================================================
// useTransactions — CRUD for transactions (Supabase)
// =====================================================

export function useTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = useCallback(async () => {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (error) console.error('Error fetching transactions:', error);
        if (data) setTransactions(data.map(mapTransaction));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Map camelCase to snake_case for SQL
        const sqlBody = {
            user_id: user.id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            category: tx.category,
            date: tx.date,
            tags: tx.tags,
            recurrent: tx.recurrent,
            recurrence_frequency: tx.recurrenceFrequency,
            payment_method: tx.paymentMethod,
            notes: tx.notes
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert([sqlBody])
            .select()
            .single();

        if (error) {
            console.error('Error adding transaction:', error);
            alert('Erro ao salvar transação: ' + error.message);
            return null;
        }

        const mapped = mapTransaction(data);
        setTransactions(prev => [mapped, ...prev]);
        return mapped;
    }, []);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        // Map updates to snake_case
        const sqlUpdates: any = { ...updates };
        if (updates.recurrenceFrequency) sqlUpdates.recurrence_frequency = updates.recurrenceFrequency;
        if (updates.paymentMethod) sqlUpdates.payment_method = updates.paymentMethod;

        // Remove camelCase versions to avoid Supabase errors
        delete sqlUpdates.recurrenceFrequency;
        delete sqlUpdates.paymentMethod;
        delete sqlUpdates.createdAt;
        delete sqlUpdates.updatedAt;

        const { data, error } = await supabase
            .from('transactions')
            .update({ ...sqlUpdates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating transaction:', error);
            return;
        }

        const mapped = mapTransaction(data);
        setTransactions(prev => prev.map(t => t.id === id ? mapped : t));
    }, []);

    const deleteTransaction = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting transaction:', error);
        else setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    return { transactions, loading, addTransaction, updateTransaction, deleteTransaction, setTransactions };
}

// =====================================================
// useBudgets — CRUD for budgets (Supabase)
// =====================================================

export function useBudgets() {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBudgets = useCallback(async () => {
        const { data, error } = await supabase
            .from('budgets')
            .select('*');

        if (error) console.error('Error fetching budgets:', error);
        if (data) setBudgets(data.map(mapBudget));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const addBudget = useCallback(async (b: Omit<Budget, 'id' | 'user_id'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('budgets')
            .insert([{ ...b, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error adding budget:', error);
            return null;
        }

        const mapped = mapBudget(data);
        setBudgets(prev => [...prev, mapped]);
        return mapped;
    }, []);

    const updateBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
        const { data, error } = await supabase
            .from('budgets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating budget:', error);
            return;
        }

        const mapped = mapBudget(data);
        setBudgets(prev => prev.map(b => b.id === id ? mapped : b));
    }, []);

    const deleteBudget = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting budget:', error);
        else setBudgets(prev => prev.filter(b => b.id !== id));
    }, []);

    const initBudgets = useCallback(async (categories: Category[]) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const month = getMonthKey(new Date());
        const newBudgets = categories.map(cat => ({
            user_id: user.id,
            category_id: cat.id,
            month,
            limit: 0,
            spent: 0
        }));

        const { data, error } = await supabase
            .from('budgets')
            .insert(newBudgets)
            .select();

        if (error) console.error('Error initializing budgets:', error);
        if (data) setBudgets(prev => [...prev, ...data.map(mapBudget)]);
    }, []);

    return { budgets, loading, addBudget, updateBudget, deleteBudget, setBudgets, initBudgets };
}

// =====================================================
// useGoals — CRUD for goals (Supabase)
// =====================================================

export function useGoals() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGoals = useCallback(async () => {
        const { data, error } = await supabase
            .from('goals')
            .select('*');

        if (error) console.error('Error fetching goals:', error);
        if (data) setGoals(data.map(mapGoal));
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const addGoal = useCallback(async (g: Omit<Goal, 'id' | 'user_id'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('goals')
            .insert([{ ...g, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error adding goal:', error);
            return null;
        }

        const mapped = mapGoal(data);
        setGoals(prev => [...prev, mapped]);
        return mapped;
    }, []);

    const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
        const { data, error } = await supabase
            .from('goals')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating goal:', error);
            return;
        }

        const mapped = mapGoal(data);
        setGoals(prev => prev.map(g => g.id === id ? mapped : g));
    }, []);

    const deleteGoal = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting goal:', error);
        else setGoals(prev => prev.filter(g => g.id !== id));
    }, []);

    const addContribution = useCallback(async (id: string, amount: number) => {
        const goal = goals.find(g => g.id === id);
        if (!goal) return;

        const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
        const { data, error } = await supabase
            .from('goals')
            .update({ currentAmount: newAmount })
            .eq('id', id)
            .select()
            .single();

        if (error) console.error('Error adding contribution:', error);
        if (data) {
            const mapped = mapGoal(data);
            setGoals(prev => prev.map(g => g.id === id ? mapped : g));
        }
    }, [goals]);

    return { goals, loading, addGoal, updateGoal, deleteGoal, addContribution, setGoals };
}

// =====================================================
// useFinancialSummary — Computed KPIs (Remains In-Memory)
// =====================================================

export function useFinancialSummary(transactions: Transaction[], month?: number, year?: number) {
    return useMemo(() => {
        const now = new Date();
        const targetMonth = month ?? now.getMonth();
        const targetYear = year ?? now.getFullYear();
        const start = startOfMonth(new Date(targetYear, targetMonth));
        const end = endOfMonth(new Date(targetYear, targetMonth));

        const prevStart = startOfMonth(subMonths(start, 1));
        const prevEnd = endOfMonth(subMonths(start, 1));

        const currentTransactions = transactions.filter((t) => {
            const d = parseISO(t.date);
            return isWithinInterval(d, { start, end });
        });

        const prevTransactions = transactions.filter((t) => {
            const d = parseISO(t.date);
            return isWithinInterval(d, { start: prevStart, end: prevEnd });
        });

        const income = currentTransactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = currentTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const prevIncome = prevTransactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const prevExpenses = prevTransactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = transactions.reduce(
            (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
            0
        );

        const savings = income - expenses;
        const prevSavings = prevIncome - prevExpenses;

        const incomeVariation = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
        const expenseVariation = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
        const savingsVariation = prevSavings !== 0 ? ((savings - prevSavings) / Math.abs(prevSavings)) * 100 : 0;

        const sparklineData = Array.from({ length: 6 }, (_, i) => {
            const m = subMonths(now, 5 - i);
            const key = getMonthKey(m);
            const mStart = startOfMonth(m);
            const mEnd = endOfMonth(m);
            const mTx = transactions.filter((t) => {
                const d = parseISO(t.date);
                return isWithinInterval(d, { start: mStart, end: mEnd });
            });
            const mIncome = mTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const mExpense = mTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            return { month: key, income: mIncome, expense: mExpense, balance: mIncome - mExpense };
        });

        return {
            income,
            expenses,
            savings,
            totalBalance,
            incomeVariation,
            expenseVariation,
            savingsVariation,
            sparklineData,
            currentTransactions,
        };
    }, [transactions, month, year]);
}
