import React, { useState } from 'react';
import {
    Plus, Edit2, Trash2, PieChart,
    AlertTriangle, CheckCircle2, TrendingUp,
    Receipt
} from 'lucide-react';
import { formatCurrency, cn } from './utils';
import { ProgressBar, Modal, CategoryBadge } from './components';
import type { Budget, Category, Transaction } from './types';

interface BudgetsPageProps {
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
    onAddBudget: (b: Omit<Budget, 'id' | 'user_id'>) => void;
    onUpdateBudget: (id: string, b: Partial<Budget>) => void;
    onDeleteBudget: (id: string) => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
    budgets, categories, transactions, onAddBudget, onUpdateBudget, onDeleteBudget
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

    // Form State
    const [category, setCategory] = useState('');
    const [limit, setLimit] = useState('0,00');

    const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const limitNum = Number(limit.replace(/[^\d]/g, '')) / 100;

        if (editingBudget) {
            onUpdateBudget(editingBudget.id, { limit: limitNum, categoryId: category });
        } else {
            onAddBudget({
                categoryId: category,
                limit: limitNum,
                month: new Date().toISOString().slice(0, 7),
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
        setLimit((b.limit * 100).toString().replace(/^0+/, ''));
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Orçamentos</h1>
                    <p className="text-text-secondary">Defina limites mensais para cada categoria de gasto.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    <span>Novo Orçamento</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {budgets.map((budget) => {
                    const category = categories.find(c => c.id === budget.categoryId);
                    const spent = transactions
                        .filter(t => t.category === budget.categoryId && t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0);
                    const percent = (spent / budget.limit) * 100;
                    const isOver = spent > budget.limit;
                    const isWarning = spent > budget.limit * 0.8;

                    return (
                        <div key={budget.id} className="glass-card p-6 flex flex-col gap-6 group relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-text-on-accent" style={{ backgroundColor: category?.color || 'var(--color-accent)' }}>
                                        <PieChart size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">{category?.name || 'Categoria Removida'}</h3>
                                        <p className="text-xs text-text-secondary">Limite mensal:</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(budget)} className="p-2 hover:bg-white/5 rounded-lg text-text-muted transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onDeleteBudget(budget.id)} className="p-2 hover:bg-negative/10 hover:text-negative rounded-lg text-text-muted transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold font-numbers">{formatCurrency(spent)}</p>
                                        <p className="text-xs text-text-muted">Gasto até agora</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-lg font-bold font-numbers text-text-secondary">{formatCurrency(budget.limit)}</p>
                                        <p className="text-xs text-text-muted">Total planejado</p>
                                    </div>
                                </div>

                                <ProgressBar
                                    value={spent}
                                    max={budget.limit}
                                    color={isOver ? 'var(--color-negative)' : (isWarning ? 'var(--color-warning)' : 'var(--color-positive)')}
                                    showPercent
                                />

                                <div className="flex items-center gap-2">
                                    {isOver ? (
                                        <div className="flex items-center gap-2 text-negative text-xs font-bold bg-negative/10 px-3 py-1.5 rounded-lg w-full">
                                            <AlertTriangle size={14} />
                                            ORÇAMENTO EXCEDIDO!
                                        </div>
                                    ) : isWarning ? (
                                        <div className="flex items-center gap-2 text-warning text-xs font-bold bg-warning/10 px-3 py-1.5 rounded-lg w-full">
                                            <AlertTriangle size={14} />
                                            PRÓXIMO DO LIMITE (80%)
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-positive text-xs font-bold bg-positive/10 px-3 py-1.5 rounded-lg w-full">
                                            <CheckCircle2 size={14} />
                                            VALOR DENTRO DO ESPERADO
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Icon Decoration */}
                            <PieChart className="absolute -right-4 -bottom-4 text-white opacity-5 pointer-events-none" size={100} />
                        </div>
                    );
                })}
                {budgets.length === 0 && (
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
                            {expenseCategories.map(c => (
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
                        className="w-full py-4 bg-accent text-white rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {editingBudget ? 'SALVAR ALTERAÇÕES' : 'CRIAR ORÇAMENTO'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};
