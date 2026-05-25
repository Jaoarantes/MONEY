import React, { useState } from 'react';
import {
    Plus, Edit2, Trash2, PieChart,
    AlertTriangle, CheckCircle2, Calendar,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatCurrency } from './utils';
import { ProgressBar, Modal } from './components';
import type { Budget, Category, Transaction } from './types';

interface BudgetsPageProps {
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
    selectedMonth: number;
    selectedYear: number;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
    onAddBudget: (b: Omit<Budget, 'id' | 'user_id'>) => void | Promise<void>;
    onUpdateBudget: (id: string, b: Partial<Budget>) => void | Promise<void>;
    onDeleteBudget: (id: string) => void | Promise<void>;
}

const normalizeCategoryValue = (value?: string) =>
    value
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const resolveTransactionCategory = (transaction: Transaction, categories: Category[]) => {
    if (transaction.category?.name) {
        return transaction.category;
    }

    const categoryId = transaction.categoryId?.toString();
    const normalizedCategory = normalizeCategoryValue(categoryId);

    return categories.find((category) =>
        category.id?.toString() === categoryId ||
        normalizeCategoryValue(category.name) === normalizedCategory
    );
};

const transactionMatchesCategory = (transaction: Transaction, category: Category | undefined, categories: Category[]) => {
    if (!category) return false;

    const transactionCategory = resolveTransactionCategory(transaction, categories);
    const normalizedTransactionCategory = normalizeCategoryValue(transactionCategory?.name || transaction.categoryId);
    const normalizedBudgetCategory = normalizeCategoryValue(category.name);
    const normalizedTransactionText = normalizeCategoryValue([
        transaction.description,
        transaction.notes,
        transaction.categoryId,
        transactionCategory?.name
    ].filter(Boolean).join(' '));
    const budgetCategoryKeywords = getBudgetCategoryKeywords(normalizedBudgetCategory);

    return transaction.category?.id === category.id ||
        transaction.categoryId?.toString() === category.id?.toString() ||
        transactionCategory?.id === category.id ||
        normalizedTransactionCategory === normalizedBudgetCategory ||
        Boolean(normalizedBudgetCategory && normalizedTransactionText?.includes(normalizedBudgetCategory)) ||
        budgetCategoryKeywords.some((keyword) => normalizedTransactionText?.includes(keyword));
};

const getBudgetCategoryKeywords = (normalizedCategory?: string) => {
    if (!normalizedCategory) return [];

    const transportKeywords = ['transporte', 'uber', '99', 'taxi', 'carro', 'corrida', 'motorista', 'gasolina', 'combustivel'];

    if (transportKeywords.some((keyword) => normalizedCategory.includes(keyword))) {
        return transportKeywords;
    }

    return [normalizedCategory];
};

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
    budgets, categories, transactions,
    selectedMonth, selectedYear, onMonthChange, onYearChange,
    onAddBudget, onUpdateBudget, onDeleteBudget
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [category, setCategory] = useState('');
    const [limit, setLimit] = useState('0,00');
    const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthBudgets = budgets.filter(b => b.month === selectedMonthKey);

    // Form State
    const allCategoriesSorted = [...categories]
        .sort((a, b) => a.name.localeCompare(b.name));

    const availableCategories = editingBudget
        ? allCategoriesSorted
        : allCategoriesSorted.filter(cat => !monthBudgets.some(b => b.categoryId === cat.id));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const limitNum = Number(limit.replace(/[^\d]/g, '')) / 100;

        if (editingBudget) {
            onUpdateBudget(editingBudget.id, { limit: limitNum, categoryId: category });
        } else {
            onAddBudget({
                categoryId: category,
                limit: limitNum,
                month: selectedMonthKey,
                spent: 0
            });
        }

        setIsModalOpen(false);
        setEditingBudget(null);
        setLimit('0,00');
        setCategory('');
    };

    const openEdit = (b: Budget) => {
        setEditingBudget(b);
        setCategory(b.categoryId);
        setLimit(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(b.limit));
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Orçamentos</h1>
                    <p className="text-text-secondary">Defina limites mensais para cada categoria de gasto.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="month-picker">
                        <button
                            className="month-picker-btn"
                            onClick={() => {
                                if (selectedMonth === 0) {
                                    onMonthChange(11);
                                    onYearChange(selectedYear - 1);
                                } else {
                                    onMonthChange(selectedMonth - 1);
                                }
                            }}
                            aria-label="Mês anterior"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="month-picker-label">
                            <Calendar size={16} className="text-accent" />
                            <span>
                                {new Date(selectedYear, selectedMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <button
                            className="month-picker-btn"
                            onClick={() => {
                                if (selectedMonth === 11) {
                                    onMonthChange(0);
                                    onYearChange(selectedYear + 1);
                                } else {
                                    onMonthChange(selectedMonth + 1);
                                }
                            }}
                            aria-label="Próximo mês"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingBudget(null); setCategory(''); setLimit('0,00'); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-text-on-accent rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-105 transition-all outline-none"
                    >
                        <Plus size={20} />
                        <span>Novo Orçamento</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {monthBudgets.map((budget) => {
                    const category = categories.find(c => c.id === budget.categoryId);
                    const spent = transactions
                        .filter(t => t.type === 'expense' && t.date.startsWith(selectedMonthKey) && transactionMatchesCategory(t, category, categories))
                        .reduce((sum, t) => sum + t.amount, 0);
                    const isOver = spent > budget.limit;
                    const isWarning = spent > budget.limit * 0.8;

                    return (
                        <div key={budget.id} className="glass-card p-6 flex flex-col gap-6 group relative overflow-hidden h-full hover:border-accent/40 hover:translate-y-[-4px] transition-all duration-300">
                            <div className="flex justify-between items-start z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-text-on-accent shadow-lg shadow-accent/20" style={{ backgroundColor: category?.color || 'var(--color-accent)' }}>
                                        <PieChart size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-text-primary leading-tight">{category?.name || 'Categoria Removida'}</h3>
                                        <p className="text-xs text-text-muted mt-1">Limite Mensal</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(budget)} className="p-2 hover:bg-bg-surface-soft rounded-xl text-text-muted hover:text-accent transition-all" title="Ajustar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => onDeleteBudget(budget.id)} className="p-2 hover:bg-negative/10 rounded-xl text-text-muted hover:text-negative transition-all" title="Excluir">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5 z-10">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-sm text-text-muted uppercase tracking-wider font-semibold">Consumido</p>
                                        <p className="text-3xl font-bold font-numbers text-text-primary">{formatCurrency(spent)}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Teto</p>
                                        <p className="text-xl font-bold font-numbers text-text-secondary">{formatCurrency(budget.limit)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <ProgressBar
                                        value={spent}
                                        max={budget.limit}
                                        color={isOver ? 'var(--color-negative)' : (isWarning ? 'var(--color-warning)' : 'var(--color-positive)')}
                                        showPercent
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    {isOver ? (
                                        <div className="flex items-center gap-2 text-negative text-[10px] font-black tracking-widest uppercase bg-negative/10 px-3 py-2 rounded-xl w-full border border-negative/20">
                                            <AlertTriangle size={14} />
                                            LIMITE EXCEDIDO
                                        </div>
                                    ) : isWarning ? (
                                        <div className="flex items-center gap-2 text-warning text-[10px] font-black tracking-widest uppercase bg-warning/10 px-3 py-2 rounded-xl w-full border border-warning/20">
                                            <AlertTriangle size={14} />
                                            ALERTA: 80% ATINGIDO
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-positive text-[10px] font-black tracking-widest uppercase bg-positive/10 px-3 py-2 rounded-xl w-full border border-positive/20">
                                            <CheckCircle2 size={14} />
                                            DENTRO DO PLANO
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Background decoration */}
                            <PieChart className="absolute -right-6 -bottom-6 text-accent opacity-[0.03] pointer-events-none rotate-12" size={160} />
                        </div>
                    );
                })}
                {monthBudgets.length === 0 && (
                    <div className="md:col-span-2 xl:col-span-3 glass p-12 text-center text-text-muted">
                        Nenhum orçamento definido. Clique em "Novo Orçamento" para começar a planejar seus gastos.
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingBudget(null); }}
                title={editingBudget ? "Editar Orçamento" : "Novo Orçamento"}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Categoria</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        >
                            <option value="">Selecione uma categoria...</option>
                            {availableCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Limite Mensal</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">R$</span>
                            <input
                                type="text"
                                value={limit}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    if (!raw) { setLimit('0,00'); return; }
                                    const val = Number(raw) / 100;
                                    setLimit(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(val));
                                }}
                                className="w-full bg-bg-input border border-border rounded-xl pl-12 pr-4 py-3 font-numbers text-xl focus:outline-none focus:border-accent transition-all"
                                required
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-accent text-text-on-accent rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {editingBudget ? 'SALVAR ALTERAÇÕES' : 'CRIAR ORÇAMENTO'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};
