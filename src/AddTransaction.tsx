import React, { useState } from 'react';
import {
    ArrowUp, ArrowDown, Calendar, Tag,
    CreditCard, FileText, Repeat, Save, Loader2,
    CheckCircle2, Plus, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, parseCurrencyInput, formatCurrencyInput } from './utils';
import type { Category, Transaction } from './types';

interface AddTransactionProps {
    categories: Category[];
    paymentMethods: string[];
    onSubmit: (tx: Omit<Transaction, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel?: () => void;
    initialData?: Transaction;
}

export const AddTransaction: React.FC<AddTransactionProps> = ({
    categories, paymentMethods, onSubmit, onCancel, initialData
}) => {
    const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
    const [amount, setAmount] = useState(initialData?.amount ? formatCurrencyInput(initialData.amount) : '0,00');
    const [description, setDescription] = useState(initialData?.description || '');
    const [category, setCategory] = useState(initialData?.category || categories.find(c => c.type === 'expense')?.id || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || paymentMethods[0] || 'Pix');
    const [recurrent, setRecurrent] = useState(initialData?.recurrent || false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(initialData?.recurrenceFrequency || 'monthly');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(initialData?.tags || []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const filteredCategories = categories.filter(c => c.type === type || c.type === 'both');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^\d]/g, '');
        if (!raw) {
            setAmount('0,00');
            return;
        }
        const val = Number(raw) / 100;
        setAmount(formatCurrencyInput(val));
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API delay
        setTimeout(() => {
            onSubmit({
                type,
                amount: parseCurrencyInput(amount),
                description,
                category,
                date,
                paymentMethod,
                recurrent,
                recurrenceFrequency: recurrent ? frequency : undefined,
                notes,
                tags
            });
            setIsSubmitting(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            if (!initialData) {
                // Reset form if creating new
                setDescription('');
                setAmount('0,00');
                setTags([]);
                setNotes('');
            }
        }, 600);
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary">
                    {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h1>
                <p className="text-text-secondary">Preencha os dados abaixo para registrar sua movimentação.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Type Switcher */}
                <div className="flex p-1 bg-bg-input border border-border rounded-2xl">
                    <button
                        type="button"
                        onClick={() => {
                            setType('income');
                            setCategory(categories.find(c => c.type === 'income')?.id || '');
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                            type === 'income' ? "bg-positive text-text-on-accent shadow-lg shadow-positive/20" : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        <ArrowUp size={20} />
                        RECEITA
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setType('expense');
                            setCategory(categories.find(c => c.type === 'expense')?.id || '');
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                            type === 'expense' ? "bg-negative text-text-on-accent shadow-lg shadow-negative/20" : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        <ArrowDown size={20} />
                        DESPESA
                    </button>
                </div>

                {/* Amount Input */}
                <div className="glass-card p-6 border-accent/20">
                    <label className="block text-xs font-bold text-text-muted uppercase mb-2 tracking-widest">Valor</label>
                    <div className="flex items-baseline gap-2">
                        <span className={cn(
                            "text-3xl font-bold font-numbers",
                            type === 'income' ? 'text-positive' : 'text-negative'
                        )}>R$</span>
                        <input
                            type="text"
                            value={amount}
                            onChange={handleAmountChange}
                            className={cn(
                                "w-full bg-transparent text-5xl font-bold font-numbers focus:outline-none",
                                type === 'income' ? 'text-positive' : 'text-negative'
                            )}
                            placeholder="0,00"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <FileText size={16} className="text-accent" /> Descrição
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Aluguel, Supermercado..."
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <Calendar size={16} className="text-accent" /> Data
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <Tag size={16} className="text-accent" /> Categoria
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                            required
                        >
                            {filteredCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <CreditCard size={16} className="text-accent" /> Meio de Pagamento
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                        >
                            {paymentMethods.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                        <Plus size={16} className="text-accent" /> Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(t => (
                            <span key={t} className="bg-accent/10 text-accent px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                {t}
                                <button onClick={() => handleRemoveTag(t)} type="button">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Pressione Enter para adicionar tag"
                        className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all"
                    />
                </div>

                {/* Recurrence */}
                <div className="glass p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                recurrent ? "bg-accent text-text-on-accent" : "bg-bg-surface-soft text-text-muted"
                            )}>
                                <Repeat size={20} />
                            </div>
                            <div>
                                <p className="font-bold">Lançamento Recorrente</p>
                                <p className="text-xs text-text-secondary">Repetir esta transação automaticamente</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRecurrent(!recurrent)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-all relative p-1",
                                recurrent ? "bg-accent" : "bg-bg-surface-soft"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full transition-all",
                                recurrent ? "ml-6" : "ml-0"
                            )} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {recurrent && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="pt-4 overflow-hidden"
                            >
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase">Frequência</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['daily', 'weekly', 'monthly', 'yearly'].map((f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setFrequency(f as any)}
                                                className={cn(
                                                    "py-2 rounded-lg text-xs font-bold transition-all border",
                                                    frequency === f ? "bg-accent border-accent text-text-on-accent shadow-lg shadow-accent/20" : "bg-bg-surface-soft border-border text-text-muted hover:text-text-primary"
                                                )}
                                            >
                                                {f === 'daily' ? 'Diário' : f === 'weekly' ? 'Semanal' : f === 'monthly' ? 'Mensal' : 'Anual'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-secondary">Anotações (opcional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Algum detalhe importante sobre este lançamento?"
                        className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-accent transition-all resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-4 px-6 rounded-2xl border border-border text-text-secondary font-bold hover:bg-bg-surface-soft transition-all"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting || !description || parseCurrencyInput(amount) <= 0}
                        className={cn(
                            "flex-[2] py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                            showSuccess ? "bg-positive text-text-on-accent" : "bg-accent text-text-on-accent shadow-xl shadow-accent/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                        )}
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : showSuccess ? (
                            <>
                                <CheckCircle2 size={20} />
                                REGISTRADO!
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                {initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
