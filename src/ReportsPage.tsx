import React, { useState } from 'react';
import { Printer, Info, Calendar } from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
    AreaChart, Area, Legend
} from 'recharts';
import { parseISO } from 'date-fns';
import { formatCurrency } from './utils';
import { ChartCard } from './components';
import type { Transaction, Category } from './types';

interface ReportsPageProps {
    transactions: Transaction[];
    categories: Category[];
}

const normalizeCategoryValue = (value?: string) =>
    value
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const resolveTransactionCategory = (transaction: Transaction, categories: Category[]) => {
    const categoryId = transaction.category?.id || transaction.categoryId?.toString();
    const normalizedCategory = normalizeCategoryValue(transaction.category?.name || transaction.categoryId);

    return categories.find((category) =>
        category.id?.toString() === categoryId ||
        normalizeCategoryValue(category.name) === normalizedCategory
    );
};

const getExpenseCategoryData = (transactions: Transaction[], categories: Category[]) => {
    const grouped = new Map<string, { name: string; value: number; color: string }>();

    transactions
        .filter((transaction) => transaction.type === 'expense')
        .forEach((transaction) => {
            const category = resolveTransactionCategory(transaction, categories);
            if (!category) return;

            const key = category.id;
            const current = grouped.get(key);

            grouped.set(key, {
                name: category.name,
                value: (current?.value || 0) + transaction.amount,
                color: category.color
            });
        });

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
};

const getTransactionDate = (transaction: Transaction) => parseISO(transaction.date);

const currencyTooltipFormatter = (value: unknown) => {
    const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value);
    return formatCurrency(Number.isFinite(numericValue) ? numericValue : 0);
};

export const ReportsPage: React.FC<ReportsPageProps> = ({ transactions, categories }) => {
    const currentYear = new Date().getFullYear();
    const availableYears = Array.from(new Set([
        currentYear,
        ...transactions.map(t => getTransactionDate(t).getFullYear())
    ])).sort((a, b) => b - a);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const safePercent = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;
    const selectedYearTransactions = transactions.filter((transaction) =>
        getTransactionDate(transaction).getFullYear() === selectedYear
    );

    // Processing data for the report
    const reportData = Array.from({ length: 12 }, (_, i) => i).map(m => {
        const monthTx = selectedYearTransactions.filter(t => getTransactionDate(t).getMonth() === m);
        const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return {
            name: new Date(selectedYear, m).toLocaleDateString('pt-BR', { month: 'short' }),
            receita: income,
            despesa: expense,
            saldo: income - expense
        };
    });

    const categorySpending = getExpenseCategoryData(selectedYearTransactions, categories);

    const totalIncome = selectedYearTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = selectedYearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalSavings = totalIncome - totalExpense;

    return (
        <div className="space-y-8 animate-fade-in-up no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Relatórios</h1>
                    <p className="text-text-secondary">Análise profunda da seu desempenho financeiro anual.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-border rounded-xl">
                        <Calendar size={18} className="text-accent" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent font-bold focus:outline-none"
                        >
                            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-border rounded-xl font-bold hover:bg-white/10 transition-all"
                    >
                        <Printer size={20} />
                        <span>Imprimir PDF</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 border-b-4 border-positive">
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Total Recebido</p>
                    <h3 className="text-3xl font-bold font-numbers text-positive">{formatCurrency(totalIncome)}</h3>
                </div>
                <div className="glass p-6 border-b-4 border-negative">
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Total Gasto</p>
                    <h3 className="text-3xl font-bold font-numbers text-negative">{formatCurrency(totalExpense)}</h3>
                </div>
                <div className="glass p-6 border-b-4 border-accent">
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Economia Líquida</p>
                    <h3 className="text-3xl font-bold font-numbers text-accent">{formatCurrency(totalSavings)}</h3>
                </div>
            </div>

            <ChartCard title={`Evolução Mensal (${selectedYear})`} subtitle="Comparativo de entradas e saídas ao longo do ano">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={reportData}>
                        <defs>
                            <linearGradient id="rIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-positive)" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="var(--color-positive)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                        <Tooltip
                            formatter={currencyTooltipFormatter}
                            contentStyle={{ backgroundColor: '#111118', border: '1px solid #222233', borderRadius: '12px' }}
                        />
                        <Area type="monotone" name="Receitas" dataKey="receita" stroke="var(--color-positive)" fill="url(#rIncome)" strokeWidth={3} />
                        <Area type="monotone" name="Despesas" dataKey="despesa" stroke="var(--color-negative)" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title={`Gastos por Categoria (${selectedYear})`}>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={categorySpending}
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                paddingAngle={0}
                                dataKey="value"
                            >
                                {categorySpending.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={currencyTooltipFormatter} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Maiores Categorias de Despesa">
                    <div className="space-y-4">
                        {categorySpending.slice(0, 7).map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-bold text-text-primary">{item.name}</span>
                                        <span className="text-sm font-numbers text-text-secondary">{formatCurrency(item.value)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${safePercent(item.value, totalExpense)}%`,
                                                backgroundColor: item.color
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-text-muted w-12 text-right">
                                    {safePercent(item.value, totalExpense).toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>

            <div className="glass p-6 space-y-4">
                <div className="flex items-center gap-2 text-accent">
                    <Info size={20} />
                    <h2 className="text-lg font-bold">Resumo Fiscal</h2>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                    Seu saldo de {selectedYear} é de <b className="text-text-primary">{formatCurrency(totalSavings)}</b>.
                    Sua maior fonte de despesa é <b>{categorySpending[0]?.name || 'nenhuma categoria'}</b>, representando {safePercent(categorySpending[0]?.value || 0, totalExpense).toFixed(1)}% dos seus gastos totais.
                    Recomendamos revisar orçamentos se a taxa de poupança estiver abaixo de 20%.
                </p>
            </div>
        </div>
    );
};
