import React, { useState } from 'react';
import {
    Plus, Target, TrendingUp, Calendar,
    Trash2, Edit2, PiggyBank, CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import { formatCurrency, cn } from './utils';
import { ProgressBar, Modal } from './components';
import { format, parseISO, differenceInMonths } from 'date-fns';
import type { Goal } from './types';

interface GoalsPageProps {
    goals: Goal[];
    onAddGoal: (g: Omit<Goal, 'id'>) => void;
    onUpdateGoal: (id: string, g: Partial<Goal>) => void;
    onDeleteGoal: (id: string) => void;
    onAddContribution: (id: string, amount: number) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
    goals, onAddGoal, onUpdateGoal, onDeleteGoal, onAddContribution
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

    // Contribution Form
    const [contribution, setContribution] = useState('0,00');

    // Goal Form
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('0,00');
    const [currentAmount, setCurrentAmount] = useState('0,00');
    const [deadline, setDeadline] = useState('');
    const [color, setColor] = useState('#6C63FF');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetNum = Number(targetAmount.replace(/[^\d]/g, '')) / 100;
        const currentNum = Number(currentAmount.replace(/[^\d]/g, '')) / 100;

        onAddGoal({
            name,
            targetAmount: targetNum,
            currentAmount: currentNum,
            deadline,
            category: 'general',
            color
        });

        setIsModalOpen(false);
        resetForm();
    };

    const handleContribution = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(contribution.replace(/[^\d]/g, '')) / 100;
        if (selectedGoal) {
            onAddContribution(selectedGoal.id, amount);
        }
        setIsContributionModalOpen(false);
        setContribution('0,00');
    };

    const resetForm = () => {
        setName('');
        setTargetAmount('0,00');
        setCurrentAmount('0,00');
        setDeadline('');
        setColor('#6C63FF');
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Metas</h1>
                    <p className="text-text-secondary">Transforme seus sonhos em realidade com planejamento.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    <span>Nova Meta</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {goals.map((goal) => {
                    const percent = (goal.currentAmount / goal.targetAmount) * 100;
                    const remaining = goal.targetAmount - goal.currentAmount;
                    const monthsLeft = Math.max(1, differenceInMonths(parseISO(goal.deadline), new Date()));
                    const monthlyRequired = remaining / monthsLeft;

                    return (
                        <div key={goal.id} className="glass-card p-8 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: goal.color, boxShadow: `0 8px 16px ${goal.color}40` }}>
                                        <Target size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-text-primary tracking-tight">{goal.name}</h2>
                                        <p className="text-sm text-text-secondary flex items-center gap-2">
                                            <Calendar size={14} />
                                            Prazo: {format(parseISO(goal.deadline), 'dd/MM/yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onDeleteGoal(goal.id)} className="p-2 hover:bg-negative/10 hover:text-negative rounded-lg text-text-muted transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-sm text-text-muted font-medium">Progresso</p>
                                        <p className="text-3xl font-bold font-numbers">{formatCurrency(goal.currentAmount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-text-muted font-medium">Objetivo</p>
                                        <p className="text-lg font-bold font-numbers text-text-secondary">{formatCurrency(goal.targetAmount)}</p>
                                    </div>
                                </div>

                                <ProgressBar
                                    value={goal.currentAmount}
                                    max={goal.targetAmount}
                                    color={goal.color}
                                    showPercent
                                />

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Faltam</p>
                                        <p className="font-bold font-numbers text-text-primary">{formatCurrency(remaining)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">Aporte Sugerido</p>
                                        <p className="font-bold font-numbers text-accent">{formatCurrency(monthlyRequired)}/mês</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold",
                                        percent >= 100 ? "bg-positive/10 text-positive" : "bg-accent/10 text-accent"
                                    )}>
                                        {percent >= 100 ? <CheckCircle2 size={14} /> : <TrendingUp size={14} />}
                                        {percent >= 100 ? 'META CONCLUÍDA!' : 'DENTRO DO PRAZO'}
                                    </div>
                                    <button
                                        onClick={() => { setSelectedGoal(goal); setIsContributionModalOpen(true); }}
                                        className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        ADICIONAR APORTE
                                    </button>
                                </div>
                            </div>

                            <Target className="absolute -right-8 -bottom-8 text-white opacity-5 pointer-events-none" size={150} />
                        </div>
                    );
                })}
            </div>

            {/* Goal Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Meta Financeira">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Nome da Meta</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Reserva de Emergência, Carro Novo..."
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Valor Alvo</label>
                            <input
                                type="text"
                                value={targetAmount}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    setTargetAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(raw) / 100));
                                }}
                                className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 font-numbers focus:outline-none focus:border-accent transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-text-secondary">Saldo Inicial</label>
                            <input
                                type="text"
                                value={currentAmount}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                    setCurrentAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(raw) / 100));
                                }}
                                className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 font-numbers focus:outline-none focus:border-accent transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Data Limite</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Cor Identificadora</label>
                        <div className="flex gap-3">
                            {['#6C63FF', '#00D9A6', '#FF4D6D', '#FFB830', '#A855F7', '#34D399'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        color === c ? "border-white scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-accent text-white rounded-xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        CRIAR META
                    </button>
                </form>
            </Modal>

            {/* Contribution Modal */}
            <Modal isOpen={isContributionModalOpen} onClose={() => setIsContributionModalOpen(false)} title="Adicionar Aporte">
                <form onSubmit={handleContribution} className="space-y-6">
                    <div className="text-center mb-4">
                        <p className="text-text-secondary text-sm">Quanto você deseja poupar para:</p>
                        <p className="text-lg font-bold text-text-primary">{selectedGoal?.name}</p>
                    </div>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">R$</span>
                        <input
                            type="text"
                            value={contribution}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, '');
                                setContribution(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(raw) / 100));
                            }}
                            className="w-full bg-bg-input border border-border rounded-xl pl-12 pr-4 py-4 text-3xl font-numbers font-bold text-center focus:outline-none focus:border-accent transition-all"
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="w-full py-4 bg-positive text-white rounded-xl font-bold shadow-xl shadow-positive/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        CONFIRMAR APORTE
                    </button>
                </form>
            </Modal>
        </div>
    );
};
