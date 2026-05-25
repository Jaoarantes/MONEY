import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ArrowUp, ArrowDown,
    Download, Calendar, Trash2, Edit2,
    Repeat, FileText,
    ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatCurrency, cn } from './utils';
import { CategoryBadge } from './components';
import { format, parseISO } from 'date-fns';
import type { Transaction, Category } from './types';

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

interface TransactionsPageProps {
    transactions: Transaction[];
    categories: Category[];
    onDelete: (id: string) => void | Promise<void>;
    onEdit: (tx: Transaction) => void;
    selectedMonth: number;
    selectedYear: number;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    transactions, categories, onDelete, onEdit,
    selectedMonth, selectedYear, onMonthChange, onYearChange
}) => {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const itemsPerPage = 10;
    const paymentMethods = Array.from(new Set(transactions.map(t => t.paymentMethod).filter(Boolean))) as string[];

    React.useEffect(() => {
        setPage(1);
    }, [search, filterType, filterCategory, filterPayment, minAmount, maxAmount, selectedMonth, selectedYear]);

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const searchLower = search.toLowerCase();
                const matchesSearch = t.description.toLowerCase().includes(searchLower) ||
                    (t.notes && t.notes.toLowerCase().includes(searchLower));

                const min = minAmount ? Number(minAmount) : 0;
                const max = maxAmount ? Number(maxAmount) : Number.POSITIVE_INFINITY;
                const matchesType = filterType === 'all' || t.type === filterType;
                const matchesCategory = filterCategory === 'all' || resolveTransactionCategory(t, categories)?.id === filterCategory;
                const matchesPayment = filterPayment === 'all' || t.paymentMethod === filterPayment;
                const matchesAmount = t.amount >= min && t.amount <= max;
                return matchesSearch && matchesType && matchesCategory && matchesPayment && matchesAmount;
            })
            .sort((a, b) => {
                const factor = sortOrder === 'asc' ? 1 : -1;
                if (sortField === 'date') return (a.date.localeCompare(b.date)) * factor;
                return (a.amount - b.amount) * factor;
            });
    }, [transactions, categories, search, filterType, filterCategory, filterPayment, minAmount, maxAmount, sortField, sortOrder]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const exportToCSV = () => {
        const headers = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor', 'Metodo'];
        const rows = filteredTransactions.map(t => [
            t.date,
            t.description,
            resolveTransactionCategory(t, categories)?.name || 'Outros',
            t.type === 'income' ? 'Receita' : 'Despesa',
            t.amount.toString(),
            t.paymentMethod || '-'
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `money_transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Transações</h1>
                    <p className="text-text-secondary">Histórico detalhado de toda sua atividade financeira.</p>
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
                            disabled={selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()}
                            aria-label="Próximo mês"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-surface-soft hover:bg-bg-surface-soft/80 border border-border rounded-xl font-medium transition-all text-text-primary"
                    >
                        <Download size={18} />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                <div className="md:col-span-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar transações ou notas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                <div className="md:col-span-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    >
                        <option value="all">Todos os tipos</option>
                        <option value="income">Apenas Receitas</option>
                        <option value="expense">Apenas Despesas</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <select
                        value={`${sortField}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-') as [typeof sortField, typeof sortOrder];
                            setSortField(field);
                            setSortOrder(order);
                        }}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    >
                        <option value="date-desc">Data (Mais recente)</option>
                        <option value="date-asc">Data (Mais antiga)</option>
                        <option value="amount-desc">Valor (Maior)</option>
                        <option value="amount-asc">Valor (Menor)</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    >
                        <option value="all">Todas as categorias</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-3">
                    <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    >
                        <option value="all">Todos os pagamentos</option>
                        {paymentMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor mín."
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                <div className="md:col-span-2">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Valor máx."
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                <div className="md:col-span-2 flex items-center justify-center gap-2 text-sm text-text-secondary">
                    <Filter size={16} />
                    <span>{filteredTransactions.length} itens</span>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="glass overflow-hidden">
                <div className="md:hidden divide-y divide-border">
                    {paginatedTransactions.map((tx) => {
                        const category = resolveTransactionCategory(tx, categories);
                        return (
                            <div key={tx.id} className="p-4 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                            tx.type === 'income' ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                                        )}>
                                            {tx.type === 'income' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-text-primary truncate">{tx.description}</p>
                                            <p className="text-xs text-text-muted">{format(parseISO(tx.date), 'dd MMM, yyyy')}</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "font-bold font-numbers whitespace-nowrap",
                                        tx.type === 'income' ? "text-positive" : "text-negative"
                                    )}>
                                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <CategoryBadge name={category?.name || 'Outros'} color={category?.color || '#8888A0'} />
                                    <span className="text-xs text-text-secondary">{tx.paymentMethod || '—'}</span>
                                </div>

                                {(tx.notes || tx.recurrent) && (
                                    <div className="rounded-xl bg-bg-surface-soft p-3 text-xs text-text-secondary">
                                        {tx.recurrent && <p className="mb-1 font-bold text-accent">Recorrente</p>}
                                        {tx.notes && <p>{tx.notes}</p>}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(tx)}
                                        className="p-2 hover:bg-accent/10 hover:text-accent rounded-lg text-text-muted transition-all"
                                        aria-label="Editar transação"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(tx.id)}
                                        className="p-2 hover:bg-negative/10 hover:text-negative rounded-lg text-text-muted transition-all"
                                        aria-label="Excluir transação"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {paginatedTransactions.length === 0 && (
                        <div className="py-16 text-center">
                            <FileText className="mx-auto text-text-muted mb-4 opacity-20" size={44} />
                            <p className="text-text-secondary">Nenhuma transação encontrada.</p>
                        </div>
                    )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-bg-surface-soft/40">
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-10"></th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Pagamento</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Valor</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedTransactions.map((tx) => {
                                const category = resolveTransactionCategory(tx, categories);
                                const isExpanded = expandedId === tx.id;

                                return (
                                    <React.Fragment key={tx.id}>
                                        <tr
                                            onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                            className={cn(
                                                "hover:bg-bg-surface-soft transition-colors group cursor-pointer",
                                                isExpanded && "bg-bg-surface-soft/50 shadow-inner"
                                            )}
                                        >
                                            <td className="px-6 py-5 text-center">
                                                <div className="text-text-muted">
                                                    {isExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-medium text-text-primary">
                                                    {format(parseISO(tx.date), 'dd MMM, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                        tx.type === 'income' ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                                                    )}>
                                                        {tx.type === 'income' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-semibold text-text-primary leading-tight">{tx.description}</p>
                                                        {tx.recurrent && (
                                                            <div className="flex items-center gap-1 text-[9px] text-accent uppercase font-bold">
                                                                <Repeat size={10} />
                                                                <span>Recorrente</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <CategoryBadge
                                                    name={category?.name || 'Outros'}
                                                    color={category?.color || '#8888A0'}
                                                />
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-xs font-medium text-text-secondary">{tx.paymentMethod || '—'}</span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <span className={cn(
                                                    "text-sm font-bold font-numbers",
                                                    tx.type === 'income' ? "text-positive" : "text-negative"
                                                )}>
                                                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onEdit(tx)}
                                                        className="p-2 hover:bg-accent/10 hover:text-accent rounded-lg text-text-muted transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(tx.id)}
                                                        className="p-2 hover:bg-negative/10 hover:text-negative rounded-lg text-text-muted transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} className="px-0 py-0 border-none">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                            className="overflow-hidden bg-bg-surface-soft/30 border-b border-border"
                                                        >
                                                            <div className="px-20 py-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                                                                        <FileText size={14} />
                                                                        Anotações & Detalhes
                                                                    </div>
                                                                    <div className="p-4 rounded-xl bg-bg-primary/50 border border-border min-h-[80px]">
                                                                        <p className={cn(
                                                                            "text-sm leading-relaxed",
                                                                            tx.notes ? "text-text-primary" : "text-text-muted italic"
                                                                        )}>
                                                                            {tx.notes || "Sem anotações para este lançamento."}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                                                                        <Calendar size={14} />
                                                                        Metadados
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="p-3 rounded-xl bg-bg-primary/50 border border-border">
                                                                            <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Criado em</p>
                                                                            <p className="text-xs text-text-primary font-numbers">
                                                                                {tx.createdAt ? format(parseISO(tx.createdAt), 'dd/MM/yyyy HH:mm') : '-'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[10px] text-text-muted italic">
                                                                        ID: <code className="bg-bg-input px-1 rounded">{tx.id}</code>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {paginatedTransactions.length === 0 && (
                        <div className="py-20 text-center">
                            <FileText className="mx-auto text-text-muted mb-4 opacity-20" size={48} />
                            <p className="text-text-secondary">Nenhuma transação encontrada.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <p className="text-sm text-text-muted">
                            Mostrando <span className="font-medium text-text-primary">{(page - 1) * itemsPerPage + 1}</span> a <span className="font-medium text-text-primary">{Math.min(page * itemsPerPage, filteredTransactions.length)}</span> de <span className="font-medium text-text-primary">{filteredTransactions.length}</span> resultados
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 hover:bg-bg-surface-soft disabled:opacity-30 rounded-lg transition-all text-text-secondary"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                            page === i + 1 ? "bg-accent text-text-on-accent" : "hover:bg-bg-surface-soft text-text-muted"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 hover:bg-bg-surface-soft disabled:opacity-30 rounded-lg transition-all text-text-secondary"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
