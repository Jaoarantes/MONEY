import React, { useState } from 'react';
import {
    Plus, Target, TrendingUp, Calendar,
    Trash2, Edit2, CheckCircle2
} from 'lucide-react';
import { formatCurrency, cn } from './utils';
import { ProgressBar, Modal } from './components';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { motion } from 'framer-motion';
import type { Goal } from './types';

interface GoalsPageProps {
    goals: Goal[];
    onAddGoal: (g: Omit<Goal, 'id' | 'user_id'>) => void | Promise<void>;
    onUpdateGoal: (id: string, g: Partial<Goal>) => void | Promise<void>;
    onDeleteGoal: (id: string) => void | Promise<void>;
    onAddContribution: (id: string, amount: number) => void | Promise<void>;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
    goals, onAddGoal, onUpdateGoal, onDeleteGoal, onAddContribution
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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

        if (editingGoal) {
            onUpdateGoal(editingGoal.id, {
                name,
                targetAmount: targetNum,
                currentAmount: currentNum,
                deadline,
                color
            });
        } else {
            onAddGoal({
                name,
                targetAmount: targetNum,
                currentAmount: currentNum,
                deadline,
                categoryId: 'general',
                color
            });
        }

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {goals.map((goal) => {
                    const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                    const monthsLeft = Math.max(1, differenceInMonths(parseISO(goal.deadline), new Date()));
                    const monthlyRequired = remaining / monthsLeft;

                    return (
                        <div key={goal.id} className="glass-card group relative overflow-hidden flex flex-col">
                            <div className="p-8 space-y-8 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-5">
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl relative transition-transform group-hover:scale-110 duration-500"
                                            style={{
                                                background: `linear-gradient(135deg, ${goal.color}, ${goal.color}dd)`,
                                                boxShadow: `0 12px 24px ${goal.color}30`
                                            }}
                                        >
                                            <Target size={32} />
                                            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-none mb-2">{goal.name}</h2>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-text-muted flex items-center gap-1.5 uppercase tracking-wider">
                                                    <Calendar size={12} className="text-accent" />
                                                    {format(parseISO(goal.deadline), 'dd MMM, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingGoal(goal); setName(goal.name); setTargetAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(goal.targetAmount)); setCurrentAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(goal.currentAmount)); setDeadline(goal.deadline); setColor(goal.color); setIsModalOpen(true); }}
                                            className="p-2.5 hover:bg-white/10 rounded-xl text-text-muted hover:text-text-primary transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteGoal(goal.id)}
                                            className="p-2.5 hover:bg-negative/10 rounded-xl text-text-muted hover:text-negative transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Acumulado</p>
                                            <p className="text-4xl font-bold font-numbers tracking-tight text-text-primary">
                                                {formatCurrency(goal.currentAmount)}
                                            </p>
                                        </div>
                                        <div className="text-right pb-1">
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-0.5">Alvo</p>
                                            <p className="text-lg font-bold font-numbers text-text-secondary">
                                                {formatCurrency(goal.targetAmount)}
                                            </p>
                                        </div>
                                    </div>

                                    <ProgressBar
                                        value={goal.currentAmount}
                                        max={goal.targetAmount}
                                        color={goal.color}
                                        showPercent
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8 py-6 border-y border-white/5">
                                    <div>
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1.5 opacity-60">Faltam</p>
                                        <p className="text-lg font-bold font-numbers text-text-primary">{formatCurrency(remaining)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1.5 opacity-60">Esforço Mensal</p>
                                        <p className="text-lg font-bold font-numbers text-accent">{formatCurrency(monthlyRequired)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-white/2 flex items-center justify-between border-t border-white/5">
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-2",
                                    percent >= 100 ? "bg-positive/20 text-positive ring-1 ring-positive/30" : "bg-accent/10 text-accent ring-1 ring-accent/30"
                                )}>
                                    {percent >= 100 ? <CheckCircle2 size={12} /> : <TrendingUp size={12} />}
                                    {percent >= 100 ? 'CONCLUÍDO' : `${monthsLeft} meses restantes`}
                                </div>
                                <button
                                    onClick={() => { setSelectedGoal(goal); setIsContributionModalOpen(true); }}
                                    className="bg-accent text-text-on-accent px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/20"
                                >
                                    Fazer Aporte
                                </button>
                            </div>

                            <Target className="absolute -right-12 -bottom-12 text-white opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity duration-1000" size={240} />
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingGoal(null); resetForm(); }} title={editingGoal ? "Editar Meta" : "Nova Meta Financeira"}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] ml-1">Essência do Sonho</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent">
                                <Target size={20} />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Reserva, Carro, Viagem..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-text-primary focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-text-muted/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] ml-1">Valor Alvo</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">R$</span>
                                <input
                                    type="text"
                                    value={targetAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^\d]/g, '');
                                        setTargetAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(raw) / 100));
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-numbers font-bold text-text-primary focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] ml-1">Saldo Atual</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">R$</span>
                                <input
                                    type="text"
                                    value={currentAmount}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^\d]/g, '');
                                        setCurrentAmount(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(raw) / 100));
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 font-numbers font-bold text-text-primary focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] ml-1">Limite da Conquista</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-accent">
                                <Calendar size={20} />
                            </div>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-text-primary focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-text-muted tracking-[0.2em] ml-1 text-center block">Vibração Visual</label>
                        <div className="flex flex-wrap justify-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                            {['#6C63FF', '#00D9A6', '#FF4D6D', '#FFB830', '#A855F7', '#0EA5E9', '#F43F5E', '#10B981'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-10 h-10 rounded-full border-4 transition-all duration-300 relative",
                                        color === c ? "scale-125 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10" : "border-transparent opacity-60 hover:opacity-100 hover:scale-110"
                                    )}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && (
                                        <motion.div layoutId="color-active" className="absolute -inset-2 border border-white/20 rounded-full animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full py-5 bg-accent text-text-on-accent rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-accent/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        <CheckCircle2 size={24} />
                        {editingGoal ? "Atualizar Meta" : "Criar Meta Agora"}
                    </button>
                </form>
            </Modal>

            {/* Contribution Modal */}
            <Modal isOpen={isContributionModalOpen} onClose={() => setIsContributionModalOpen(false)} title="Adicionar Aporte">
                <form onSubmit={handleContribution} className="space-y-6">
                    <div className="text-center mb-4">
                        <p className="text-text-secondary text-sm">Quanto vocé deseja poupar para:</p>
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

                    <button type="submit" className="w-full py-4 bg-positive text-text-on-accent rounded-xl font-bold shadow-xl shadow-positive/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        CONFIRMAR APORTE
                    </button>
                </form>
            </Modal>
        </div>
    );
};
