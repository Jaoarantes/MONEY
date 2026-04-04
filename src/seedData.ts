// =====================================================
// SEED DATA — Default categories, transactions, goals, budgets
// =====================================================

import { v4 as uuid } from 'uuid';
import { subDays, subMonths, format } from 'date-fns';
import type { Transaction, Category, Goal, Budget } from './types';

const now = new Date();
const DUMMY_USER_ID = '00000000-0000-0000-0000-000000000000';

export const DEFAULT_CATEGORIES: Category[] = [
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Alimentação', type: 'expense', icon: 'UtensilsCrossed', color: '#FF6B6B', budget: 1200 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Moradia', type: 'expense', icon: 'Home', color: '#4ECDC4', budget: 2500 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Transporte', type: 'expense', icon: 'Car', color: '#45B7D1', budget: 600 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Saúde', type: 'expense', icon: 'Heart', color: '#FF4D6D', budget: 400 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Lazer', type: 'expense', icon: 'Gamepad2', color: '#A855F7', budget: 500 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Educação', type: 'expense', icon: 'GraduationCap', color: '#6C63FF', budget: 300 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Vestuário', type: 'expense', icon: 'Shirt', color: '#F472B6', budget: 350 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Assinaturas', type: 'expense', icon: 'CreditCard', color: '#FB923C', budget: 200 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Mercado', type: 'expense', icon: 'ShoppingCart', color: '#34D399', budget: 800 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Contas', type: 'expense', icon: 'Receipt', color: '#FBBF24', budget: 600 },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Salário', type: 'income', icon: 'Banknote', color: '#00D9A6' },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Freelance', type: 'income', icon: 'Laptop', color: '#6C63FF' },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Investimentos', type: 'income', icon: 'TrendingUp', color: '#FFB830' },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Presente', type: 'both', icon: 'Gift', color: '#F472B6' },
    { id: uuid(), user_id: DUMMY_USER_ID, name: 'Outros', type: 'both', icon: 'MoreHorizontal', color: '#8888A0' },
];

function randomAmount(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const expenseCategories = DEFAULT_CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both');
const incomeCategories = DEFAULT_CATEGORIES.filter(c => c.type === 'income' || c.type === 'both');

const expenseDescriptions = [
    'Almoço restaurante', 'Uber para o trabalho', 'Netflix mensal', 'Feira do mês',
    'Conta de luz', 'Farmácia', 'Gasolina', 'Academia mensal', 'Internet fibra',
    'Café especial', 'Manutenção carro', 'Curso online', 'Roupas nova', 'Jantar fora',
    'Conta de água', 'Dentista', 'Cinema', 'Spotify premium', 'Livro técnico',
    'Supermercado semanal', 'Seguro auto', 'Plano de saúde', 'Presente aniversário',
];

const incomeDescriptions = [
    'Salário mensal', 'Projeto freelance', 'Dividendos ações', 'Rendimento CDB',
    'Bônus trimestral', 'Venda produto usado', 'Cashback acumulado',
];

const paymentMethods = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'TED', 'Boleto'];

export function generateSeedTransactions(): Transaction[] {
    const transactions: Transaction[] = [];

    // 30 transactions distributed over last 3 months
    for (let i = 0; i < 30; i++) {
        const isIncome = i < 8; // ~8 incomes, 22 expenses
        const daysAgo = Math.floor(Math.random() * 90);
        const date = subDays(now, daysAgo);
        const cat = isIncome ? randomItem(incomeCategories) : randomItem(expenseCategories);
        const desc = isIncome ? randomItem(incomeDescriptions) : randomItem(expenseDescriptions);
        const ts = date.toISOString();

        transactions.push({
            id: uuid(),
            user_id: DUMMY_USER_ID,
            type: isIncome ? 'income' : 'expense',
            amount: isIncome ? randomAmount(2000, 8000) : randomAmount(15, 1500),
            description: desc,
            categoryId: cat.id,
            date: format(date, 'yyyy-MM-dd'),
            recurrent: Math.random() < 0.2,
            recurrenceFrequency: Math.random() < 0.2 ? 'monthly' : undefined,
            paymentMethod: randomItem(paymentMethods),
            notes: '',
            createdAt: ts,
            updatedAt: ts,
        });
    }

    return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

export function generateSeedGoals(): Goal[] {
    return [
        {
            id: uuid(),
            user_id: DUMMY_USER_ID,
            name: 'Fundo de Emergência',
            targetAmount: 15000,
            currentAmount: 6800,
            deadline: format(subMonths(now, -8), 'yyyy-MM-dd'),
            categoryId: 'savings',
            color: '#00D9A6',
        },
        {
            id: uuid(),
            user_id: DUMMY_USER_ID,
            name: 'Viagem de Férias',
            targetAmount: 8000,
            currentAmount: 3200,
            deadline: format(subMonths(now, -5), 'yyyy-MM-dd'),
            categoryId: 'travel',
            color: '#6C63FF',
        },
    ];
}

export function generateSeedBudgets(categories: Category[]): Budget[] {
    const month = format(now, 'yyyy-MM');
    return categories
        .filter(c => c.type === 'expense' && c.budget)
        .map(c => ({
            id: uuid(),
            user_id: DUMMY_USER_ID,
            categoryId: c.id,
            month,
            limit: c.budget ?? 500,
            spent: Math.round(Math.random() * (c.budget ?? 500) * 0.85),
        }));
}
