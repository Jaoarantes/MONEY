// =====================================================
// HOOKS — Supabase SQL Persistence Layer
// =====================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
    subMonths, startOfMonth, endOfMonth,
    parseISO, isWithinInterval, addDays, addWeeks, addMonths, addYears, format
} from 'date-fns';
import type {
    Transaction, Category, Goal, Budget, Investment,
    AppSettings, ToastMessage
} from './types';
import { getMonthKey } from './utils';

type SqlRow = Record<string, unknown>;
type TransactionUpdates = {
    type?: Transaction['type'];
    amount?: number;
    description?: string;
    category?: string;
    date?: string;
    recurrent?: boolean;
    recurrence_frequency?: Transaction['recurrenceFrequency'];
    payment_method?: string;
    notes?: string;
};
type BudgetUpdates = Partial<Budget> & { category_id?: string };
type GoalUpdates = {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    deadline?: string;
    category?: string;
    color?: string;
};
type InvestmentUpdates = {
    name?: string;
    type?: Investment['type'];
    broker?: string;
    invested_amount?: number;
    current_value?: number;
    monthly_yield?: number;
    annual_yield?: number;
    quantity?: number;
    unit_price?: number;
    purchase_date?: string;
    liquidity?: Investment['liquidity'];
    risk?: Investment['risk'];
    notes?: string;
    color?: string;
};

const DEFAULT_PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'TED', 'Boleto'];

const TRANSACTION_SELECT = '*, category:categories!transactions_category_fkey(id, name, color)';
const BUDGETS_CLEARED_KEY = 'money-budgets-cleared-v1';
const OLD_EXPENSES_CLEARED_KEY = 'money-old-expenses-cleared-before-2026-05';
const EXPENSE_HISTORY_CUTOFF = '2026-05-01';
const MIN_VARIATION_BASE = 0.01;

const isSqlRow = (value: unknown): value is SqlRow =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getCategoryIdentity = (category: Pick<Category, 'name' | 'type'>) =>
    `${category.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}::${category.type}`;

const dedupeCategories = (categories: Category[]) => {
    const categoriesByIdentity = new Map<string, Category>();

    categories.forEach((category) => {
        const identity = getCategoryIdentity(category);
        const existing = categoriesByIdentity.get(identity);

        if (!existing) {
            categoriesByIdentity.set(identity, category);
            return;
        }

        const existingCreatedAt = existing.createdAt || '';
        const categoryCreatedAt = category.createdAt || '';

        if (categoryCreatedAt && (!existingCreatedAt || categoryCreatedAt < existingCreatedAt)) {
            categoriesByIdentity.set(identity, category);
        }
    });

    return Array.from(categoriesByIdentity.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const calculateVariation = (current: number, previous: number) => {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
        return 0;
    }

    if (Math.abs(previous) < MIN_VARIATION_BASE) {
        return Math.abs(current) < MIN_VARIATION_BASE ? 0 : (current > 0 ? 100 : -100);
    }

    return ((current - previous) / Math.abs(previous)) * 100;
};

const addRecurrenceInterval = (date: Date, frequency?: Transaction['recurrenceFrequency']) => {
    switch (frequency) {
        case 'daily':
            return addDays(date, 1);
        case 'weekly':
            return addWeeks(date, 1);
        case 'yearly':
            return addYears(date, 1);
        case 'monthly':
        default:
            return addMonths(date, 1);
    }
};

// =====================================================
// MAPPERS — SQL (snake_case) to TS (camelCase)
// =====================================================

const mapTransaction = (sql: SqlRow): Transaction => {
    const category = isSqlRow(sql.category) ? sql.category : undefined;

    return {
        ...(sql as unknown as Transaction),
        amount: Number(sql.amount),
        category: category ? {
            id: String(category.id || ''),
            name: String(category.name || ''),
            color: String(category.color || '#8888A0')
        } : undefined,
        categoryId: String(category?.id || sql.category || sql.category_id || sql.categoryId || ''),
        paymentMethod: sql.payment_method ? String(sql.payment_method) : undefined,
        createdAt: String(sql.created_at || ''),
        updatedAt: String(sql.updated_at || '')
    };
};

const mapCategory = (sql: SqlRow): Category => ({
    ...(sql as unknown as Category),
    createdAt: String(sql.created_at || '')
});

const mapGoal = (sql: SqlRow): Goal => ({
    ...(sql as unknown as Goal),
    targetAmount: Number(sql.target_amount),
    currentAmount: Number(sql.current_amount),
    categoryId: String(sql.category || sql.category_id || ''),
    createdAt: String(sql.created_at || '')
});

const mapBudget = (sql: SqlRow): Budget => ({
    ...(sql as unknown as Budget),
    limit: Number(sql.limit),
    spent: Number(sql.spent || 0),
    categoryId: String(sql.category_id || ''),
    createdAt: String(sql.created_at || '')
});

const mapInvestment = (sql: SqlRow): Investment => ({
    ...(sql as unknown as Investment),
    investedAmount: Number(sql.invested_amount ?? sql.investedAmount ?? 0),
    currentValue: Number(sql.current_value ?? sql.currentValue ?? 0),
    monthlyYield: Number(sql.monthly_yield ?? sql.monthlyYield ?? 0),
    annualYield: Number(sql.annual_yield ?? sql.annualYield ?? 0),
    quantity: sql.quantity === null || sql.quantity === undefined ? undefined : Number(sql.quantity),
    unitPrice: sql.unit_price === null || sql.unit_price === undefined ? undefined : Number(sql.unit_price),
    purchaseDate: String(sql.purchase_date || sql.purchaseDate || ''),
    createdAt: String(sql.created_at || ''),
    updatedAt: String(sql.updated_at || '')
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
            paymentMethods: DEFAULT_PAYMENT_METHODS
        };
    });

    const setSettings = useCallback((val: AppSettings | ((prev: AppSettings) => AppSettings)) => {
        setStoredSettings(prev => {
            const next = typeof val === 'function' ? (val as (prev: AppSettings) => AppSettings)(prev) : val;
            localStorage.setItem('app-settings', JSON.stringify(next));
            return next;
        });
    }, []);

    const settings = {
        ...storedSettings,
        paymentMethods: storedSettings.paymentMethods || DEFAULT_PAYMENT_METHODS
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

export function useCategories(enabled = true) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(enabled);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) console.error('Error fetching categories:', error);
            setCategories(data ? dedupeCategories(data.map(mapCategory)) : []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setCategories([]);
            setLoading(false);
            return;
        }
        fetchCategories();
    }, [enabled, fetchCategories]);

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
        setCategories(prev => dedupeCategories([...prev, mapped]));
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
            return null;
        }

        const mapped = mapCategory(data);
        setCategories(prev => dedupeCategories(prev.map(c => c.id === id ? mapped : c)));
        return mapped;
    }, []);

    const deleteCategory = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            return false;
        }
        setCategories(prev => prev.filter(c => c.id !== id));
        return true;
    }, []);

    const seedInitialCategories = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { DEFAULT_CATEGORIES } = await import('./seedData');

        const { data: existingCategories, error: existingCategoriesError } = await supabase
            .from('categories')
            .select('*');

        if (existingCategoriesError) {
            console.error('Error checking existing categories:', existingCategoriesError);
            return;
        }

        const existingCategoryKeys = new Set(
            (existingCategories || []).map((category) =>
                getCategoryIdentity({
                    name: String(category.name || ''),
                    type: (category.type === 'income' || category.type === 'both') ? category.type : 'expense'
                })
            )
        );

        // 1. Seed Categories
        const newCatsBody = DEFAULT_CATEGORIES.map(c => ({
            user_id: user.id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
            budget: c.budget
        })).filter((category) => !existingCategoryKeys.has(getCategoryIdentity(category)));

        if (newCatsBody.length === 0) {
            setCategories(dedupeCategories((existingCategories || []).map(mapCategory)));
            localStorage.removeItem(BUDGETS_CLEARED_KEY);
            return;
        }

        const { data: catsData, error: catError } = await supabase
            .from('categories')
            .insert(newCatsBody)
            .select();

        if (catError || !catsData) {
            console.error('Error seeding categories:', catError);
            return;
        }

        const mappedCats = dedupeCategories([...(existingCategories || []).map(mapCategory), ...catsData.map(mapCategory)]);
        setCategories(mappedCats);

        localStorage.removeItem(BUDGETS_CLEARED_KEY);
    }, [setCategories]);

    return { categories, loading, addCategory, updateCategory, deleteCategory, seedInitialCategories };
}

// =====================================================
// useTransactions — CRUD for transactions (Supabase)
// =====================================================

export function useTransactions(enabled = true) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(enabled);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('transactions')
                .select(TRANSACTION_SELECT)
                .order('date', { ascending: false });

            if (error) console.error('Error fetching transactions:', error);
            if (data?.length && !localStorage.getItem(OLD_EXPENSES_CLEARED_KEY)) {
                const oldExpenseIds = data
                    .filter((transaction) => transaction.type === 'expense' && String(transaction.date) < EXPENSE_HISTORY_CUTOFF)
                    .map((transaction) => String(transaction.id));

                if (oldExpenseIds.length > 0) {
                    const { error: deleteError } = await supabase
                        .from('transactions')
                        .delete()
                        .in('id', oldExpenseIds);

                    if (deleteError) {
                        console.error('Error clearing old expenses:', deleteError);
                        setTransactions(data.map(mapTransaction));
                        return;
                    }
                }

                localStorage.setItem(OLD_EXPENSES_CLEARED_KEY, 'true');
                setTransactions(data
                    .filter((transaction) => !oldExpenseIds.includes(String(transaction.id)))
                    .map(mapTransaction));
                return;
            }

            setTransactions(data ? data.map(mapTransaction) : []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setTransactions([]);
            setLoading(false);
            return;
        }
        fetchTransactions();
    }, [enabled, fetchTransactions]);

    const addTransaction = useCallback(async (tx: Omit<Transaction, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const firstDate = parseISO(tx.date);
        const occurrences = tx.recurrent
            ? Array.from({ length: 12 }, (_, index) => {
                let occurrenceDate = firstDate;
                for (let step = 0; step < index; step += 1) {
                    occurrenceDate = addRecurrenceInterval(occurrenceDate, tx.recurrenceFrequency);
                }
                return occurrenceDate;
            })
            : [firstDate];

        // Map camelCase to snake_case for SQL
        const sqlBody = occurrences.map((occurrenceDate, index) => ({
            user_id: user.id,
            type: tx.type,
            amount: tx.amount,
            description: tx.recurrent && index > 0 ? `${tx.description} (${index + 1}/12)` : tx.description,
            category: tx.categoryId,
            date: format(occurrenceDate, 'yyyy-MM-dd'),
            recurrent: tx.recurrent,
            recurrence_frequency: tx.recurrenceFrequency,
            payment_method: tx.paymentMethod,
            notes: tx.notes
        }));

        const { data, error } = await supabase
            .from('transactions')
            .insert(sqlBody)
            .select(TRANSACTION_SELECT);

        if (error) {
            console.error('Error adding transaction:', error);
            return false;
        }

        const mapped = data.map(mapTransaction);
        setTransactions(prev => [...mapped, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
        return true;
    }, []);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        // Explicitly map allowed fields to snake_case for Supabase
        const sqlUpdates: TransactionUpdates = {};
        if (updates.type !== undefined) sqlUpdates.type = updates.type;
        if (updates.amount !== undefined) sqlUpdates.amount = updates.amount;
        if (updates.description !== undefined) sqlUpdates.description = updates.description;
        if (updates.categoryId !== undefined) sqlUpdates.category = updates.categoryId;
        if (updates.date !== undefined) sqlUpdates.date = updates.date;
        if (updates.recurrent !== undefined) sqlUpdates.recurrent = updates.recurrent;
        if (updates.recurrenceFrequency !== undefined) sqlUpdates.recurrence_frequency = updates.recurrenceFrequency;
        if (updates.paymentMethod !== undefined) sqlUpdates.payment_method = updates.paymentMethod;
        if (updates.notes !== undefined) sqlUpdates.notes = updates.notes;

        const { data, error } = await supabase
            .from('transactions')
            .update(sqlUpdates)
            .eq('id', id)
            .select(TRANSACTION_SELECT)
            .single();

        if (error) {
            console.error('Error updating transaction:', error);
            return false;
        }

        if (data) {
            const mapped = mapTransaction(data);
            setTransactions(prev => prev.map(t => t.id === id ? mapped : t));
            return true;
        }
        return false;
    }, []);

    const deleteTransaction = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting transaction:', error);
            return false;
        }
        setTransactions(prev => prev.filter(t => t.id !== id));
        return true;
    }, []);

    return { transactions, loading, addTransaction, updateTransaction, deleteTransaction };
}

// =====================================================
// useBudgets — CRUD for budgets (Supabase)
// =====================================================

export function useBudgets(enabled = true) {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(enabled);

    const fetchBudgets = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('budgets')
                .select('*');

            if (error) console.error('Error fetching budgets:', error);
            if (data?.length && !localStorage.getItem(BUDGETS_CLEARED_KEY)) {
                const { error: deleteError } = await supabase
                    .from('budgets')
                    .delete()
                    .in('id', data.map((budget) => budget.id));

                if (deleteError) {
                    console.error('Error clearing budgets:', deleteError);
                    setBudgets(data.map(mapBudget));
                    return;
                }

                localStorage.setItem(BUDGETS_CLEARED_KEY, 'true');
                setBudgets([]);
                return;
            }

            localStorage.setItem(BUDGETS_CLEARED_KEY, 'true');
            setBudgets(data ? data.map(mapBudget) : []);
        } catch (error) {
            console.error('Error fetching budgets:', error);
            setBudgets([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setBudgets([]);
            setLoading(false);
            return;
        }
        fetchBudgets();
    }, [enabled, fetchBudgets]);

    const addBudget = useCallback(async (b: Omit<Budget, 'id' | 'user_id'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const sqlBody = {
            user_id: user.id,
            category_id: b.categoryId,
            month: b.month,
            limit: b.limit,
            spent: b.spent
        };

        const { data, error } = await supabase
            .from('budgets')
            .insert([sqlBody])
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
        const sqlBody: BudgetUpdates = { ...updates };
        if (updates.categoryId) {
            sqlBody.category_id = updates.categoryId;
            delete sqlBody.categoryId;
        }

        const { data, error } = await supabase
            .from('budgets')
            .update(sqlBody)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating budget:', error);
            return null;
        }

        const mapped = mapBudget(data);
        setBudgets(prev => prev.map(b => b.id === id ? mapped : b));
        return mapped;
    }, []);

    const deleteBudget = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting budget:', error);
            return false;
        }
        setBudgets(prev => prev.filter(b => b.id !== id));
        return true;
    }, []);

    return { budgets, loading, addBudget, updateBudget, deleteBudget };
}

// =====================================================
// useGoals — CRUD for goals (Supabase)
// =====================================================

export function useGoals(enabled = true) {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(enabled);

    const fetchGoals = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('goals')
                .select('*');

            if (error) console.error('Error fetching goals:', error);
            setGoals(data ? data.map(mapGoal) : []);
        } catch (error) {
            console.error('Error fetching goals:', error);
            setGoals([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setGoals([]);
            setLoading(false);
            return;
        }
        fetchGoals();
    }, [enabled, fetchGoals]);

    const addGoal = useCallback(async (g: Omit<Goal, 'id' | 'user_id'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const isValidUUID = g.categoryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(g.categoryId);

        const sqlBody = {
            user_id: user.id,
            name: g.name,
            target_amount: g.targetAmount,
            current_amount: g.currentAmount,
            deadline: g.deadline,
            category: isValidUUID ? g.categoryId : null,
            color: g.color
        };

        const { data, error } = await supabase
            .from('goals')
            .insert([sqlBody])
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
        const sqlUpdates: GoalUpdates = {};
        if (updates.name !== undefined) sqlUpdates.name = updates.name;
        if (updates.targetAmount !== undefined) sqlUpdates.target_amount = updates.targetAmount;
        if (updates.currentAmount !== undefined) sqlUpdates.current_amount = updates.currentAmount;
        if (updates.deadline !== undefined) sqlUpdates.deadline = updates.deadline;
        if (updates.categoryId !== undefined) sqlUpdates.category = updates.categoryId;
        if (updates.color !== undefined) sqlUpdates.color = updates.color;

        const { data, error } = await supabase
            .from('goals')
            .update(sqlUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating goal:', error);
            return null;
        }

        const mapped = mapGoal(data);
        setGoals(prev => prev.map(g => g.id === id ? mapped : g));
        return mapped;
    }, []);

    const deleteGoal = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting goal:', error);
            return false;
        }
        setGoals(prev => prev.filter(g => g.id !== id));
        return true;
    }, []);

    const addContribution = useCallback(async (id: string, amount: number) => {
        const goal = goals.find(g => g.id === id);
        if (!goal) return null;

        const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
        const { data, error } = await supabase
            .from('goals')
            .update({ current_amount: newAmount })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error adding contribution:', error);
            return null;
        }
        if (data) {
            const mapped = mapGoal(data);
            setGoals(prev => prev.map(g => g.id === id ? mapped : g));
            return mapped;
        }
        return null;
    }, [goals]);

    return { goals, loading, addGoal, updateGoal, deleteGoal, addContribution };
}

// =====================================================
// useFinancialSummary — Computed KPIs (Remains In-Memory)
// =====================================================

// =====================================================
// useInvestments - CRUD for investments (Supabase)
// =====================================================

export function useInvestments(enabled = true) {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(enabled);

    const fetchInvestments = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('investments')
                .select('*')
                .order('purchase_date', { ascending: false });

            if (error) console.error('Error fetching investments:', error);
            setInvestments(data ? data.map(mapInvestment) : []);
        } catch (error) {
            console.error('Error fetching investments:', error);
            setInvestments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setInvestments([]);
            setLoading(false);
            return;
        }
        fetchInvestments();
    }, [enabled, fetchInvestments]);

    const addInvestment = useCallback(async (investment: Omit<Investment, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const sqlBody = {
            user_id: user.id,
            name: investment.name,
            type: investment.type,
            broker: investment.broker,
            invested_amount: investment.investedAmount,
            current_value: investment.currentValue,
            monthly_yield: investment.monthlyYield,
            annual_yield: investment.annualYield,
            quantity: investment.quantity,
            unit_price: investment.unitPrice,
            purchase_date: investment.purchaseDate,
            liquidity: investment.liquidity,
            risk: investment.risk,
            notes: investment.notes,
            color: investment.color
        };

        const { data, error } = await supabase
            .from('investments')
            .insert([sqlBody])
            .select()
            .single();

        if (error) {
            console.error('Error adding investment:', error);
            return null;
        }

        const mapped = mapInvestment(data);
        setInvestments(prev => [mapped, ...prev]);
        return mapped;
    }, []);

    const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
        const sqlUpdates: InvestmentUpdates = {};
        if (updates.name !== undefined) sqlUpdates.name = updates.name;
        if (updates.type !== undefined) sqlUpdates.type = updates.type;
        if (updates.broker !== undefined) sqlUpdates.broker = updates.broker;
        if (updates.investedAmount !== undefined) sqlUpdates.invested_amount = updates.investedAmount;
        if (updates.currentValue !== undefined) sqlUpdates.current_value = updates.currentValue;
        if (updates.monthlyYield !== undefined) sqlUpdates.monthly_yield = updates.monthlyYield;
        if (updates.annualYield !== undefined) sqlUpdates.annual_yield = updates.annualYield;
        if (updates.quantity !== undefined) sqlUpdates.quantity = updates.quantity;
        if (updates.unitPrice !== undefined) sqlUpdates.unit_price = updates.unitPrice;
        if (updates.purchaseDate !== undefined) sqlUpdates.purchase_date = updates.purchaseDate;
        if (updates.liquidity !== undefined) sqlUpdates.liquidity = updates.liquidity;
        if (updates.risk !== undefined) sqlUpdates.risk = updates.risk;
        if (updates.notes !== undefined) sqlUpdates.notes = updates.notes;
        if (updates.color !== undefined) sqlUpdates.color = updates.color;

        const { data, error } = await supabase
            .from('investments')
            .update(sqlUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating investment:', error);
            return null;
        }

        const mapped = mapInvestment(data);
        setInvestments(prev => prev.map(i => i.id === id ? mapped : i));
        return mapped;
    }, []);

    const deleteInvestment = useCallback(async (id: string) => {
        const { error } = await supabase
            .from('investments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting investment:', error);
            return false;
        }
        setInvestments(prev => prev.filter(i => i.id !== id));
        return true;
    }, []);

    return { investments, loading, addInvestment, updateInvestment, deleteInvestment };
}

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

        // Balance carried over from all months BEFORE the selected month
        const previousBalance = transactions
            .filter((t) => {
                const d = parseISO(t.date);
                return d < start;
            })
            .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

        const savings = income - expenses;
        const prevSavings = prevIncome - prevExpenses;

        const incomeVariation = calculateVariation(income, prevIncome);
        const expenseVariation = calculateVariation(expenses, prevExpenses);
        const savingsVariation = calculateVariation(savings, prevSavings);

        const targetDate = new Date(targetYear, targetMonth);
        const sparklineData = Array.from({ length: 6 }, (_, i) => {
            const m = subMonths(targetDate, 5 - i);
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
            previousBalance,
            incomeVariation,
            expenseVariation,
            savingsVariation,
            sparklineData,
            currentTransactions,
        };
    }, [transactions, month, year]);
}
