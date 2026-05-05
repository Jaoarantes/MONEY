import React, { useMemo, useState } from 'react';
import {
    Plus, TrendingUp, TrendingDown, WalletCards, Landmark,
    Edit2, Trash2, ShieldAlert, Clock, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { ChartCard, Modal, ProgressBar } from './components';
import { cn, formatCurrency, formatCurrencyInput, parseCurrencyInput } from './utils';
import type { Investment } from './types';

interface InvestmentsPageProps {
    investments: Investment[];
    onAddInvestment: (investment: Omit<Investment, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => void | Promise<void>;
    onUpdateInvestment: (id: string, investment: Partial<Investment>) => void | Promise<void>;
    onDeleteInvestment: (id: string) => void | Promise<void>;
}

const INVESTMENT_TYPES: Array<{ id: Investment['type']; label: string; color: string }> = [
    { id: 'fixed_income', label: 'Renda Fixa', color: '#00D9A6' },
    { id: 'stock', label: 'Ações', color: '#6C63FF' },
    { id: 'fii', label: 'FIIs', color: '#FFB830' },
    { id: 'crypto', label: 'Cripto', color: '#FF4D6D' },
    { id: 'fund', label: 'Fundos', color: '#0EA5E9' },
    { id: 'international', label: 'Exterior', color: '#A855F7' },
    { id: 'other', label: 'Outros', color: '#94A3B8' }
];

const LIQUIDITY_LABELS: Record<Investment['liquidity'], string> = {
    daily: 'Diária',
    short: 'Até 30 dias',
    medium: '1 a 12 meses',
    long: 'Mais de 1 ano',
    locked: 'Bloqueado'
};

const RISK_LABELS: Record<Investment['risk'], string> = {
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto'
};

const DEFAULT_FORM: Omit<Investment, 'id' | 'user_id' | 'createdAt' | 'updatedAt'> = {
    name: '',
    type: 'fixed_income',
    broker: '',
    investedAmount: 0,
    currentValue: 0,
    monthlyYield: 0,
    annualYield: 0,
    quantity: undefined,
    unitPrice: undefined,
    purchaseDate: new Date().toISOString().slice(0, 10),
    liquidity: 'daily',
    risk: 'low',
    notes: '',
    color: '#00D9A6'
};

const percent = (value: number, total: number) => total > 0 ? (value / total) * 100 : 0;
const getTypeMeta = (type: Investment['type']) => INVESTMENT_TYPES.find(item => item.id === type) || INVESTMENT_TYPES[6];

const KpiTile = ({
    title, value, detail, icon, tone
}: {
    title: string;
    value: string;
    detail: string;
    icon: React.ReactNode;
    tone: 'accent' | 'positive' | 'negative' | 'warning';
}) => (
    <div className="glass-card p-6 flex items-start justify-between gap-4 min-h-[150px]">
        <div className="space-y-3">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</p>
            <h3 className={cn(
                "text-2xl font-bold font-numbers tracking-tight",
                tone === 'positive' && "text-positive",
                tone === 'negative' && "text-negative",
                tone === 'warning' && "text-warning",
                tone === 'accent' && "text-accent"
            )}>{value}</h3>
            <p className="text-sm text-text-secondary">{detail}</p>
        </div>
        <div className={cn(
            "p-3 rounded-xl",
            tone === 'positive' && "bg-positive/10 text-positive",
            tone === 'negative' && "bg-negative/10 text-negative",
            tone === 'warning' && "bg-warning/10 text-warning",
            tone === 'accent' && "bg-accent/10 text-accent"
        )}>
            {icon}
        </div>
    </div>
);

export const InvestmentsPage: React.FC<InvestmentsPageProps> = ({
    investments, onAddInvestment, onUpdateInvestment, onDeleteInvestment
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [investedAmountInput, setInvestedAmountInput] = useState('0,00');
    const [currentValueInput, setCurrentValueInput] = useState('0,00');
    const [unitPriceInput, setUnitPriceInput] = useState('0,00');

    const metrics = useMemo(() => {
        const invested = investments.reduce((sum, item) => sum + item.investedAmount, 0);
        const current = investments.reduce((sum, item) => sum + item.currentValue, 0);
        const profit = current - invested;
        const monthlyIncome = investments.reduce((sum, item) => sum + item.currentValue * (item.monthlyYield / 100), 0);
        const weightedAnnual = current > 0
            ? investments.reduce((sum, item) => sum + item.annualYield * item.currentValue, 0) / current
            : 0;

        const allocationByType = INVESTMENT_TYPES
            .map(type => ({
                name: type.label,
                value: investments.filter(item => item.type === type.id).reduce((sum, item) => sum + item.currentValue, 0),
                color: type.color
            }))
            .filter(item => item.value > 0);

        const allocationByBroker = Array.from(new Set(investments.map(item => item.broker || 'Sem corretora')))
            .map(broker => ({
                name: broker,
                value: investments.filter(item => (item.broker || 'Sem corretora') === broker).reduce((sum, item) => sum + item.currentValue, 0)
            }))
            .sort((a, b) => b.value - a.value);

        const performanceData = investments
            .map(item => ({
                name: item.name,
                investido: item.investedAmount,
                atual: item.currentValue,
                lucro: item.currentValue - item.investedAmount
            }))
            .sort((a, b) => b.atual - a.atual)
            .slice(0, 8);

        return { invested, current, profit, monthlyIncome, weightedAnnual, allocationByType, allocationByBroker, performanceData };
    }, [investments]);

    const roi = percent(metrics.profit, metrics.invested);
    const highRiskShare = percent(
        investments.filter(item => item.risk === 'high').reduce((sum, item) => sum + item.currentValue, 0),
        metrics.current
    );
    const dailyLiquidityShare = percent(
        investments.filter(item => item.liquidity === 'daily').reduce((sum, item) => sum + item.currentValue, 0),
        metrics.current
    );

    const openCreate = () => {
        setEditingInvestment(null);
        setForm(DEFAULT_FORM);
        setInvestedAmountInput('0,00');
        setCurrentValueInput('0,00');
        setUnitPriceInput('0,00');
        setIsModalOpen(true);
    };

    const openEdit = (investment: Investment) => {
        setEditingInvestment(investment);
        setForm({
            name: investment.name,
            type: investment.type,
            broker: investment.broker,
            investedAmount: investment.investedAmount,
            currentValue: investment.currentValue,
            monthlyYield: investment.monthlyYield,
            annualYield: investment.annualYield,
            quantity: investment.quantity,
            unitPrice: investment.unitPrice,
            purchaseDate: investment.purchaseDate,
            liquidity: investment.liquidity,
            risk: investment.risk,
            notes: investment.notes || '',
            color: investment.color
        });
        setInvestedAmountInput(formatCurrencyInput(investment.investedAmount));
        setCurrentValueInput(formatCurrencyInput(investment.currentValue));
        setUnitPriceInput(formatCurrencyInput(investment.unitPrice || 0));
        setIsModalOpen(true);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const payload = {
            ...form,
            investedAmount: parseCurrencyInput(investedAmountInput),
            currentValue: parseCurrencyInput(currentValueInput),
            unitPrice: parseCurrencyInput(unitPriceInput),
            color: form.color || getTypeMeta(form.type).color
        };

        if (editingInvestment) {
            onUpdateInvestment(editingInvestment.id, payload);
        } else {
            onAddInvestment(payload);
        }

        setIsModalOpen(false);
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Investimentos</h1>
                    <p className="text-text-secondary">Acompanhe patrimônio, rentabilidade, risco e onde seu dinheiro está aplicado.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-text-on-accent rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    <span>Novo Investimento</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KpiTile title="Patrimônio Investido" value={formatCurrency(metrics.current)} detail={`${formatCurrency(metrics.invested)} aplicados`} icon={<WalletCards size={24} />} tone="accent" />
                <KpiTile title="Resultado Total" value={formatCurrency(metrics.profit)} detail={`${roi.toFixed(2)}% sobre o investido`} icon={metrics.profit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />} tone={metrics.profit >= 0 ? 'positive' : 'negative'} />
                <KpiTile title="Renda Mensal Estimada" value={formatCurrency(metrics.monthlyIncome)} detail={`${metrics.weightedAnnual.toFixed(2)}% a.a. ponderado`} icon={<Landmark size={24} />} tone="positive" />
                <KpiTile title="Liquidez Diária" value={`${dailyLiquidityShare.toFixed(0)}%`} detail={`${highRiskShare.toFixed(0)}% em alto risco`} icon={<Clock size={24} />} tone="warning" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="insight-panel">
                    <PieIcon size={20} className="text-accent" />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Maior classe</p>
                        <p className="text-sm text-text-primary">
                            {metrics.allocationByType[0] ? `${metrics.allocationByType[0].name}: ${formatCurrency(metrics.allocationByType[0].value)}` : 'Nenhum investimento cadastrado.'}
                        </p>
                    </div>
                </div>
                <div className="insight-panel">
                    <ShieldAlert size={20} className={highRiskShare > 35 ? 'text-warning' : 'text-positive'} />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Risco</p>
                        <p className="text-sm text-text-primary">
                            {highRiskShare > 35 ? 'Carteira concentrada em ativos de alto risco.' : 'Exposição de risco sob controle.'}
                        </p>
                    </div>
                </div>
                <div className="insight-panel">
                    <BarChart3 size={20} className="text-positive" />
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Corretoras</p>
                        <p className="text-sm text-text-primary">
                            {metrics.allocationByBroker.length} instituição(ões) na carteira.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <ChartCard title="Alocação por Classe" subtitle="Distribuição pelo valor atual" className="xl:col-span-5">
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie data={metrics.allocationByType} dataKey="value" innerRadius={70} outerRadius={105} paddingAngle={1}>
                                {metrics.allocationByType.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Investido vs Valor Atual" subtitle="Top 8 posições por valor atual" className="xl:col-span-7">
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={metrics.performanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: '#111118', border: '1px solid #222233', borderRadius: '12px' }} />
                            <Bar name="Investido" dataKey="investido" fill="var(--color-text-muted)" radius={[4, 4, 0, 0]} />
                            <Bar name="Atual" dataKey="atual" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <ChartCard title="Por Corretora" subtitle="Concentração por instituição" className="xl:col-span-1">
                    <div className="space-y-5">
                        {metrics.allocationByBroker.map((broker) => (
                            <div key={broker.name} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-text-primary">{broker.name}</span>
                                    <span className="font-numbers text-text-secondary">{formatCurrency(broker.value)}</span>
                                </div>
                                <ProgressBar value={broker.value} max={metrics.current} color="var(--color-accent)" showPercent />
                            </div>
                        ))}
                        {metrics.allocationByBroker.length === 0 && <p className="text-center text-text-muted p-8">Cadastre seus investimentos para ver a concentração.</p>}
                    </div>
                </ChartCard>

                <div className="xl:col-span-2 glass-card overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Carteira Detalhada</h2>
                            <p className="text-sm text-text-secondary">Posições, rentabilidade, liquidez e risco.</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-text-muted uppercase text-[10px] tracking-widest">
                                <tr className="border-b border-border">
                                    <th className="px-6 py-4">Ativo</th>
                                    <th className="px-6 py-4">Atual</th>
                                    <th className="px-6 py-4">Resultado</th>
                                    <th className="px-6 py-4">Rentab.</th>
                                    <th className="px-6 py-4">Risco</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.map((investment) => {
                                    const gain = investment.currentValue - investment.investedAmount;
                                    const typeMeta = getTypeMeta(investment.type);
                                    return (
                                        <tr key={investment.id} className="border-b border-border/60 hover:bg-bg-surface-soft transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: investment.color || typeMeta.color }}>
                                                        {investment.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-text-primary">{investment.name}</p>
                                                        <p className="text-xs text-text-muted">{typeMeta.label} - {investment.broker}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-numbers font-bold">{formatCurrency(investment.currentValue)}</td>
                                            <td className={cn("px-6 py-4 font-numbers font-bold", gain >= 0 ? "text-positive" : "text-negative")}>
                                                {formatCurrency(gain)} ({percent(gain, investment.investedAmount).toFixed(2)}%)
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary">{investment.monthlyYield.toFixed(2)}% a.m. / {investment.annualYield.toFixed(2)}% a.a.</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-bold",
                                                    investment.risk === 'low' && "bg-positive/10 text-positive",
                                                    investment.risk === 'medium' && "bg-warning/10 text-warning",
                                                    investment.risk === 'high' && "bg-negative/10 text-negative"
                                                )}>{RISK_LABELS[investment.risk]}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => openEdit(investment)} className="p-2 hover:bg-bg-surface-soft rounded-lg text-text-muted hover:text-accent transition-all" title="Editar">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => onDeleteInvestment(investment.id)} className="p-2 hover:bg-negative/10 rounded-lg text-text-muted hover:text-negative transition-all" title="Excluir">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {investments.length === 0 && (
                        <div className="p-12 text-center text-text-muted">Nenhum investimento cadastrado. Clique em "Novo Investimento" para montar sua carteira.</div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-text-secondary">Nome do ativo</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent" placeholder="Tesouro Selic, PETR4, BTC..." required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Classe</label>
                            <select value={form.type} onChange={(e) => {
                                const type = e.target.value as Investment['type'];
                                setForm({ ...form, type, color: getTypeMeta(type).color });
                            }} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent">
                                {INVESTMENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Corretora/Banco</label>
                            <input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent" placeholder="NuInvest, XP, Inter..." required />
                        </div>
                        <CurrencyField label="Valor aplicado" value={investedAmountInput} onChange={setInvestedAmountInput} />
                        <CurrencyField label="Valor atual" value={currentValueInput} onChange={setCurrentValueInput} />
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Rentab. mensal (%)</label>
                            <input type="number" step="0.01" value={form.monthlyYield} onChange={(e) => setForm({ ...form, monthlyYield: Number(e.target.value) })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Rentab. anual (%)</label>
                            <input type="number" step="0.01" value={form.annualYield} onChange={(e) => setForm({ ...form, annualYield: Number(e.target.value) })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Quantidade</label>
                            <input type="number" step="0.000001" value={form.quantity ?? ''} onChange={(e) => setForm({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent" />
                        </div>
                        <CurrencyField label="Preço médio/unitário" value={unitPriceInput} onChange={setUnitPriceInput} />
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Data de compra</label>
                            <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent [color-scheme:dark]" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Liquidez</label>
                            <select value={form.liquidity} onChange={(e) => setForm({ ...form, liquidity: e.target.value as Investment['liquidity'] })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent">
                                {Object.entries(LIQUIDITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Risco</label>
                            <select value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value as Investment['risk'] })} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent">
                                {Object.entries(RISK_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <label className="text-sm font-semibold text-text-secondary">Observações</label>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent resize-none" placeholder="Objetivo, vencimento, estratégia..." />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-accent text-text-on-accent rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        {editingInvestment ? 'SALVAR INVESTIMENTO' : 'ADICIONAR INVESTIMENTO'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

const CurrencyField = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-2">
        <label className="text-sm font-semibold text-text-secondary">{label}</label>
        <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">R$</span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(formatCurrencyInput(parseCurrencyInput(e.target.value)))}
                className="w-full bg-bg-input border border-border rounded-xl pl-12 pr-4 py-3 font-numbers focus:outline-none focus:border-accent"
                required
            />
        </div>
    </div>
);
