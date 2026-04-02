// =====================================================
// HOOKS — All custom hooks for the finance app
// =====================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import type { Transaction, Category, Goal, Budget, AppSettings, ToastMessage } from './types';
import { DEFAULT_CATEGORIES, generateSeedTransactions, generateSeedGoals, generateSeedBudgets } from './seedData';
import { getMonthKey } from './utils';

// =====================================================
// useStorage<T> — typed localStorage wrapper
// =====================================================

export function useStorage<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored) as T;
            }
        } catch {
            // ignore parse errors
        }
        return defaultValue;
    });

    const setStoredValue = useCallback(
        (val: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
                localStorage.setItem(key, JSON.stringify(next));
                return next;
            });
        },
        [key]
    );

    return [value, setStoredValue];
}

// =====================================================
// useToast — notification system
// =====================================================

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((type: ToastMessage['type'], message: string) => {
        const id = uuid();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}

// =====================================================
// useSettings — app settings management
// =====================================================

export function useSettings() {
    const [settings, setSettings] = useStorage<AppSettings>('app-settings', {
        currency: 'BRL',
        locale: 'pt-BR',
        theme: 'dark',
        monthStart: 1,
    });

    const toggleTheme = useCallback(() => {
        setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
        }));
    }, [setSettings]);

    return { settings, setSettings, toggleTheme };
}

// =====================================================
// useCategories — CRUD for categories
// =====================================================

export function useCategories() {
    const [categories, setCategories] = useStorage<Category[]>('categories', []);
    const [initialized, setInitialized] = useStorage<boolean>('categories-init', false);

    useEffect(() => {
        if (!initialized && categories.length === 0) {
            setCategories(DEFAULT_CATEGORIES);
            setInitialized(true);
        }
    }, [initialized, categories.length, setCategories, setInitialized]);

    const addCategory = useCallback(
        (cat: Omit<Category, 'id'>) => {
            const newCat: Category = { ...cat, id: uuid() };
            setCategories((prev) => [...prev, newCat]);
            return newCat;
        },
        [setCategories]
    );

    const updateCategory = useCallback(
        (id: string, updates: Partial<Category>) => {
            setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
        },
        [setCategories]
    );

    const deleteCategory = useCallback(
        (id: string) => {
            setCategories((prev) => prev.filter((c) => c.id !== id));
        },
        [setCategories]
    );

    const getCategoryById = useCallback(
        (id: string) => categories.find((c) => c.id === id),
        [categories]
    );

    return { categories, addCategory, updateCategory, deleteCategory, getCategoryById, setCategories };
}

// =====================================================
// useTransactions — CRUD for transactions
// =====================================================

export function useTransactions() {
    const [transactions, setTransactions] = useStorage<Transaction[]>('transactions', []);
    const [initialized, setInitialized] = useStorage<boolean>('transactions-init', false);

    useEffect(() => {
        if (!initialized && transactions.length === 0) {
            setTransactions(generateSeedTransactions());
            setInitialized(true);
        }
    }, [initialized, transactions.length, setTransactions, setInitialized]);

    const addTransaction = useCallback(
        (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
            const now = new Date().toISOString();
            const newTx: Transaction = { ...tx, id: uuid(), createdAt: now, updatedAt: now };
            setTransactions((prev) => [newTx, ...prev]);
            return newTx;
        },
        [setTransactions]
    );

    const updateTransaction = useCallback(
        (id: string, updates: Partial<Transaction>) => {
            setTransactions((prev) =>
                prev.map((t) =>
                    t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                )
            );
        },
        [setTransactions]
    );

    const deleteTransaction = useCallback(
        (id: string) => {
            setTransactions((prev) => prev.filter((t) => t.id !== id));
        },
        [setTransactions]
    );

    return { transactions, addTransaction, updateTransaction, deleteTransaction, setTransactions };
}

// =====================================================
// useBudgets — CRUD for budgets
// =====================================================

export function useBudgets() {
    const [budgets, setBudgets] = useStorage<Budget[]>('budgets', []);
    const [initialized, setInitialized] = useStorage<boolean>('budgets-init', false);

    const initBudgets = useCallback(
        (categories: Category[]) => {
            if (!initialized && budgets.length === 0) {
                setBudgets(generateSeedBudgets(categories));
                setInitialized(true);
            }
        },
        [initialized, budgets.length, setBudgets, setInitialized]
    );

    const addBudget = useCallback(
        (b: Omit<Budget, 'id'>) => {
            const newBudget: Budget = { ...b, id: uuid() };
            setBudgets((prev) => [...prev, newBudget]);
            return newBudget;
        },
        [setBudgets]
    );

    const updateBudget = useCallback(
        (id: string, updates: Partial<Budget>) => {
            setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
        },
        [setBudgets]
    );

    const deleteBudget = useCallback(
        (id: string) => {
            setBudgets((prev) => prev.filter((b) => b.id !== id));
        },
        [setBudgets]
    );

    return { budgets, addBudget, updateBudget, deleteBudget, setBudgets, initBudgets };
}

// =====================================================
// useGoals — CRUD for financial goals
// =====================================================

export function useGoals() {
    const [goals, setGoals] = useStorage<Goal[]>('goals', []);
    const [initialized, setInitialized] = useStorage<boolean>('goals-init', false);

    useEffect(() => {
        if (!initialized && goals.length === 0) {
            setGoals(generateSeedGoals());
            setInitialized(true);
        }
    }, [initialized, goals.length, setGoals, setInitialized]);

    const addGoal = useCallback(
        (g: Omit<Goal, 'id'>) => {
            const newGoal: Goal = { ...g, id: uuid() };
            setGoals((prev) => [...prev, newGoal]);
            return newGoal;
        },
        [setGoals]
    );

    const updateGoal = useCallback(
        (id: string, updates: Partial<Goal>) => {
            setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
        },
        [setGoals]
    );

    const deleteGoal = useCallback(
        (id: string) => {
            setGoals((prev) => prev.filter((g) => g.id !== id));
        },
        [setGoals]
    );

    const addContribution = useCallback(
        (id: string, amount: number) => {
            setGoals((prev) =>
                prev.map((g) =>
                    g.id === id
                        ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) }
                        : g
                )
            );
        },
        [setGoals]
    );

    return { goals, addGoal, updateGoal, deleteGoal, addContribution, setGoals };
}

// =====================================================
// useFinancialSummary — Computed KPIs
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

        // Sparkline data (last 6 months)
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
