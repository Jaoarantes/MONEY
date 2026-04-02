import React, { useState, useMemo } from 'react';
import {
    Search, Filter, ArrowUp, ArrowDown,
    Download, Calendar, Trash2, Edit2,
    MoreHorizontal, ChevronLeft, ChevronRight,
    Repeat, FileText, CheckCircle2, AlertCircle
} from 'lucide-react';
import { formatCurrency, cn } from './utils';
import { CategoryBadge } from './components';
import { format, parseISO } from 'date-fns';
import type { Transaction, Category } from './types';

interface TransactionsPageProps {
    transactions: Transaction[];
    categories: Category[];
    onDelete: (id: string) => void;
    onEdit: (tx: Transaction) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
    transactions, categories, onDelete, onEdit
}) => {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
                const matchesType = filterType === 'all' || t.type === filterType;
                return matchesSearch && matchesType;
            })
            .sort((a, b) => {
                const factor = sortOrder === 'asc' ? 1 : -1;
                if (sortField === 'date') return (a.date.localeCompare(b.date)) * factor;
                return (a.amount - b.amount) * factor;
            });
    }, [transactions, search, filterType, sortField, sortOrder]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const exportToCSV = () => {
        const headers = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor', 'Metodo'];
        const rows = filteredTransactions.map(t => [
            t.date,
            t.description,
            categories.find(c => c.id === t.category)?.name || 'Outros',
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
                    <h1 className="text-3xl font-bold text-text-primary">Transações</h1>
                    <p className="text-text-secondary">Histórico detalhado de toda sua atividade financeira.</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-xl font-medium transition-all"
                >
                    <Download size={18} />
                    <span>Exportar CSV</span>
                </button>
            </div>

            {/* Filters Bar */}
            <div className="glass p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por descrição..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-bg-input border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                <div className="md:col-span-3">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
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
                            const [field, order] = e.target.value.split('-') as [any, any];
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

                <div className="md:col-span-2 flex items-center justify-center gap-2 text-sm text-text-secondary">
                    <Filter size={16} />
                    <span>{filteredTransactions.length} itens</span>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="glass overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-white/[0.02]">
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
                                const category = categories.find(c => c.id === tx.category);
                                return (
                                    <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-text-primary">
                                                {format(parseISO(tx.date), 'dd MMM, yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    tx.type === 'income' ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                                                )}>
                                                    {tx.type === 'income' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary">{tx.description}</p>
                                                    {tx.recurrent && (
                                                        <div className="flex items-center gap-1 text-[10px] text-accent uppercase font-bold">
                                                            <Repeat size={10} />
                                                            <span>Recorrente</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <CategoryBadge name={category?.name || 'Outros'} color={category?.color || '#8888A0'} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs text-text-secondary">{tx.paymentMethod || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={cn(
                                                "text-sm font-bold font-numbers",
                                                tx.type === 'income' ? "text-positive" : "text-negative"
                                            )}>
                                                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
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
                                className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg transition-all"
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
                                            page === i + 1 ? "bg-accent text-white" : "hover:bg-white/5 text-text-muted"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg transition-all"
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
