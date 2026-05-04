import React from 'react';
import {
    TrendingUp, TrendingDown, Wallet, PiggyBank,
    ChevronLeft, ChevronRight, Calendar, Lightbulb, AlertTriangle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine,
    RadialBarChart, RadialBar
} from 'recharts';
import { KPICard, ChartCard, ProgressBar } from './components';
import { formatCurrency } from './utils';
import type { Transaction, Category, Goal, Budget } from './types';

type SparklinePoint = {
    month: string;
    income: number;
    expense: number;
    balance: number;
};

type FinancialSummary = {
    income: number;
    expenses: number;
    savings: number;
    previousBalance: number;
    incomeVariation: number;
    expenseVariation: number;
    savingsVariation: number;
    sparklineData: SparklinePoint[];
};

interface DashboardProps {
    summary: FinancialSummary;
    transactions: Transaction[];
    categories: Category[];
    goals: Goal[];
    budgets: Budget[];
    selectedMonth: number;
    selectedYear: number;
    onMonthChange: (month: number) => void;
    onYearChange: (year: number) => void;
}

type TooltipPayload = {
    color?: string;
    name?: string;
    value?: number;
};

const getTransactionCategoryId = (transaction: Transaction) => transaction.categoryId?.toString();

const safePercent = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip glass-strong">
                <p className="text-xs text-text-secondary mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <p className="text-sm font-bold text-text-primary">
                            {entry.name}: {formatCurrency(entry.value ?? 0)}
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC<DashboardProps> = ({
    summary, transactions, categories, goals, budgets,
    selectedMonth, selectedYear, onMonthChange, onYearChange
}) => {
    // Chart 1: Cash Flow (Area)
    const cashFlowData = summary.sparklineData;
    const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthBudgets = budgets.filter(b => b.month === selectedMonthKey);

    // Chart 3: Distribution by Category
    const categoryData = categories
        .map(cat => {
            const spent = transactions
                .filter(t => {
                    const tCatId = getTransactionCategoryId(t);
                    return tCatId === cat.id?.toString() && t.type === 'expense';
                })
                .reduce((sum, t) => sum + t.amount, 0);
            return { name: cat.name, value: spent, color: cat.color };
        })
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);

    // Chart 5: Budget vs Spent
    const budgetData = monthBudgets.map(b => {
        const cat = categories.find(c => c.id?.toString() === b.categoryId?.toString());
        const spent = transactions
            .filter(t => {
                const tCatId = getTransactionCategoryId(t);
                return tCatId === b.categoryId?.toString() && t.type === 'expense';
            })
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            name: cat?.name || 'Outros',
            limit: b.limit,
            spent: spent,
            percent: safePercent(spent, b.limit),
            color: spent > b.limit ? 'var(--color-negative)' : (spent > b.limit * 0.8 ? 'var(--color-warning)' : 'var(--color-positive)')
        };
    }).slice(0, 5);

    // Chart 6: Top Expenses
    const topExpenses = [...transactions]
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8)
        .map(t => ({
            name: t.description,
            amount: t.amount,
            category: categories.find(c => {
                const tCatId = getTransactionCategoryId(t);
                return c.id === tCatId;
            })?.name || 'Outros'
        }));

    // Chart 8: Goals Progress
    const radialData = goals.map(g => ({
        name: g.name,
        uv: safePercent(g.currentAmount, g.targetAmount),
        fill: g.color
    }));

    const savingsRate = safePercent(summary.savings, summary.income);
    const topCategory = categoryData[0];
    const criticalBudgets = budgetData.filter(item => item.percent >= 80);

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header with Month Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Visão Geral</h1>
                    <p className="text-text-secondary">Bem-vindo de volta! Aqui está o resumo das suas finanças.</p>
                </div>
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
            </div>

            {/* Balance Summary Strip */}
            <div className="balance-strip glass-card p-4">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-text-muted" />
                        <span className="text-text-secondary">Saldo Anterior:</span>
                        <span className={`font-bold font-numbers ${summary.previousBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {formatCurrency(summary.previousBalance)}
                        </span>
                    </div>
                    <span className="text-text-muted">+</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-positive" />
                        <span className="text-text-secondary">Receitas:</span>
                        <span className="font-bold font-numbers text-positive">{formatCurrency(summary.income)}</span>
                    </div>
                    <span className="text-text-muted">-</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-negative" />
                        <span className="text-text-secondary">Despesas:</span>
                        <span className="font-bold font-numbers text-negative">{formatCurrency(summary.expenses)}</span>
                    </div>
                    <span className="text-text-muted">=</span>
                    <div className="flex items-center gap-2 pl-2 border-l border-border">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                        <span className="text-text-secondary font-medium">Saldo Final:</span>
                        <span className={`font-bold font-numbers text-base ${(summary.previousBalance + summary.savings) >= 0 ? 'text-accent' : 'text-negative'}`}>
                            {formatCurrency(summary.previousBalance + summary.savings)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="insight-panel">
                    <Lightbulb size={20} className="text-accent" />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Leitura do mês</p>
                        <p className="text-sm text-text-primary">
                            {summary.income > 0
                                ? `Você guardou ${savingsRate.toFixed(0)}% das receitas deste período.`
                                : 'Sem receitas registradas neste período.'}
                        </p>
                    </div>
                </div>
                <div className="insight-panel">
                    <TrendingDown size={20} className="text-negative" />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Maior gasto</p>
                        <p className="text-sm text-text-primary">
                            {topCategory ? `${topCategory.name}: ${formatCurrency(topCategory.value)}` : 'Nenhuma despesa no mês.'}
                        </p>
                    </div>
                </div>
                <div className="insight-panel">
                    <AlertTriangle size={20} className={criticalBudgets.length > 0 ? 'text-warning' : 'text-positive'} />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Orçamentos</p>
                        <p className="text-sm text-text-primary">
                            {criticalBudgets.length > 0
                                ? `${criticalBudgets.length} orçamento(s) acima de 80%.`
                                : 'Tudo tranquilo nos limites ativos.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Saldo do Mês"
                    value={summary.previousBalance + summary.savings}
                    variation={summary.savingsVariation}
                    icon={<Wallet size={24} />}
                    color="accent"
                    sparklineData={summary.sparklineData}
                />
                <KPICard
                    title="Receitas do Mês"
                    value={summary.income}
                    variation={summary.incomeVariation}
                    icon={<TrendingUp size={24} />}
                    color="positive"
                    sparklineData={summary.sparklineData.map((d) => ({ ...d, balance: d.income }))}
                />
                <KPICard
                    title="Despesas do Mês"
                    value={summary.expenses}
                    variation={summary.expenseVariation}
                    icon={<TrendingDown size={24} />}
                    color="negative"
                    sparklineData={summary.sparklineData.map((d) => ({ ...d, balance: d.expense }))}
                />
                <KPICard
                    title="Economia"
                    value={summary.savings}
                    variation={summary.savingsVariation}
                    icon={<PiggyBank size={24} />}
                    color="warning"
                    sparklineData={summary.sparklineData}
                />
            </div>

            {/* Primary Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Chart 1: Fluxo de Caixa */}
                <ChartCard
                    title="Fluxo de Caixa"
                    subtitle="Receitas e despesas acumuladas nos últimos meses"
                    className="xl:col-span-8"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={cashFlowData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-positive)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-positive)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-negative)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-negative)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" name="Receitas" dataKey="income" stroke="var(--color-positive)" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                            <Area type="monotone" name="Despesas" dataKey="expense" stroke="var(--color-negative)" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Chart 3: Distribuição por Categoria */}
                <ChartCard
                    title="Gastos por Categoria"
                    subtitle="Onde você mais gastou este mês"
                    className="xl:col-span-4"
                >
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={0}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Secondary Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartCard title="Receitas vs Despesas (6 meses)" subtitle="Comparativo de entradas e saídas">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar name="Receita" dataKey="income" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
                            <Bar name="Despesa" dataKey="expense" fill="var(--color-negative)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Evolução do Patrimônio" subtitle="Saldo líquido acumulado">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="var(--color-text-muted)" />
                            <Line
                                type="monotone"
                                name="Saldo"
                                dataKey="balance"
                                stroke="var(--color-accent)"
                                strokeWidth={3}
                                dot={{ fill: 'var(--color-accent)', r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Budget Progress */}
            <ChartCard title="Orçamentos Ativos" subtitle="Progresso de gastos em relação ao limite">
                <div className="space-y-6">
                    {budgetData.map((item, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-text-primary">{item.name}</span>
                                <span className="text-text-secondary">
                                    {formatCurrency(item.spent)} / <b>{formatCurrency(item.limit)}</b>
                                </span>
                            </div>
                            <ProgressBar
                                value={item.spent}
                                max={item.limit}
                                color={item.color}
                                showPercent
                            />
                        </div>
                    ))}
                    {budgetData.length === 0 && <p className="text-center text-text-muted p-4">Nenhum orçamento configurado.</p>}
                </div>
            </ChartCard>

            {/* Ranking & Goals */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ChartCard title="Maiores Gastos" subtitle="As 8 transações mais altas do período">
                    <div className="space-y-4">
                        {topExpenses.map((expense, index) => (
                            <div key={index} className="flex items-center gap-4 group">
                                <div className="w-8 h-8 rounded-lg bg-bg-surface-soft flex items-center justify-center text-xs font-bold text-text-muted">
                                    #{index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-text-primary">{expense.name}</p>
                                    <p className="text-xs text-text-muted">{expense.category}</p>
                                </div>
                                <div className="text-sm font-bold text-negative">
                                    - {formatCurrency(expense.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Metas Financeiras" subtitle="Progresso de conclusão das suas metas">
                    <ResponsiveContainer width="100%" height={300}>
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="10%"
                            outerRadius="80%"
                            barSize={10}
                            data={radialData}
                        >
                            <RadialBar
                                label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                                background
                                dataKey="uv"
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            <Tooltip />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-4">
                        {goals.map(goal => (
                            <div key={goal.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-surface-soft border border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color }} />
                                    <span className="text-sm font-medium text-text-primary">{goal.name}</span>
                                </div>
                                <div className="text-sm font-bold text-text-primary">{(goal.currentAmount / goal.targetAmount * 100).toFixed(0)}%</div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};
