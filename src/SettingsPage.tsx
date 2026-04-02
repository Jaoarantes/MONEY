import React, { useState } from 'react';
import {
    Settings as SettingsIcon, Trash2, Download,
    Upload, Moon, Sun, Calendar, Plus,
    AlertCircle, RefreshCcw, CreditCard, Tag,
    Edit2, ChevronRight, Check, X, Palette
} from 'lucide-react';
import { cn } from './utils';
import type { Category, AppSettings } from './types';

interface SettingsPageProps {
    settings: AppSettings;
    categories: Category[];
    onUpdateSettings: (s: AppSettings) => void;
    onUpdateCategories: (cats: Category[]) => void;
    onExportData: () => void;
    onImportData: (data: string) => void;
    onResetData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    settings, categories, onUpdateSettings, onUpdateCategories,
    onExportData, onImportData, onResetData
}) => {
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingPayMethod, setEditingPayMethod] = useState<string | null>(null);

    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#6C63FF');
    const [newCatType, setNewCatType] = useState<'income' | 'expense' | 'both'>('expense');

    const [newPayMethod, setNewPayMethod] = useState('');
    const [isResetConfirm, setIsResetConfirm] = useState(false);

    const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'payments' | 'data'>('general');

    // HANDLERS
    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        const newCat: Category = {
            id: crypto.randomUUID(),
            name: newCatName,
            type: newCatType,
            icon: 'Tag',
            color: newCatColor
        };
        onUpdateCategories([...categories, newCat]);
        setNewCatName('');
    };

    const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
        onUpdateCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleAddPaymentMethod = () => {
        if (!newPayMethod.trim()) return;
        if (settings.paymentMethods?.includes(newPayMethod.trim())) return;

        onUpdateSettings({
            ...settings,
            paymentMethods: [...(settings.paymentMethods || []), newPayMethod.trim()]
        });
        setNewPayMethod('');
    };

    const handleUpdatePaymentMethod = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return;
        onUpdateSettings({
            ...settings,
            paymentMethods: settings.paymentMethods.map(m => m === oldName ? newName : m)
        });
        setEditingPayMethod(null);
    };

    const handleDeletePaymentMethod = (method: string) => {
        onUpdateSettings({
            ...settings,
            paymentMethods: settings.paymentMethods.filter(m => m !== method)
        });
    };

    const handleDeleteCategory = (id: string) => {
        onUpdateCategories(categories.filter(c => c.id !== id));
    };

    return (
        <div className="max-w-5xl space-y-8 animate-fade-in-up pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Configurações do App</h1>
                    <p className="text-text-secondary">Personalize sua experiência, gerencie dados e estéticas.</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-border">
                    {[
                        { id: 'general', label: 'Geral', icon: SettingsIcon },
                        { id: 'categories', label: 'Categorias', icon: Tag },
                        { id: 'payments', label: 'Pagamentos', icon: CreditCard },
                        { id: 'data', label: 'Dados', icon: RefreshCcw }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                activeTab === tab.id ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-text-secondary"
                            )}
                        >
                            <tab.icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'general' && (
                <div className="glass-card p-8 space-y-8">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <SettingsIcon size={24} className="text-accent" />
                        <h2 className="text-xl font-bold">Preferências do Sistema</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-text-muted uppercase tracking-widest">Início do Ciclo Financeiro</label>
                            <div className="flex items-center gap-4 bg-bg-input p-4 rounded-2xl border border-border">
                                <Calendar size={20} className="text-accent" />
                                <select
                                    value={settings.monthStart}
                                    onChange={(e) => onUpdateSettings({ ...settings, monthStart: Number(e.target.value) })}
                                    className="flex-1 bg-transparent font-bold focus:outline-none"
                                >
                                    {Array.from({ length: 31 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>Dia {i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-text-muted">Suas métricas mensais serão calculadas a partir deste dia.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-text-muted uppercase tracking-widest">Aparência Visual</label>
                            <div className="flex p-1 bg-bg-input border border-border rounded-2xl">
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                                        settings.theme === 'light' ? "bg-white text-black shadow-xl" : "text-text-muted"
                                    )}
                                >
                                    <Sun size={20} /> Modo Claro
                                </button>
                                <button
                                    onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                                        settings.theme === 'dark' ? "bg-accent text-white shadow-xl shadow-accent/20" : "text-text-muted"
                                    )}
                                >
                                    <Moon size={20} /> Modo Escuro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="space-y-6">
                    {/* Add Category Section */}
                    <div className="glass-card p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="text-accent" /> Nova Categoria
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase">Nome da Categoria</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder="Saúde, Lazer..."
                                    className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 focus:border-accent transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase">Tipo de Fluxo</label>
                                <div className="flex p-1 bg-bg-input border border-border rounded-xl">
                                    {(['income', 'expense', 'both'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setNewCatType(t)}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                                newCatType === t ? "bg-accent text-white shadow-md" : "text-text-muted"
                                            )}
                                        >
                                            {t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Misto'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase flex justify-between">
                                    Cor Customizada <Palette size={12} />
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={newCatColor}
                                        onChange={(e) => setNewCatColor(e.target.value)}
                                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer p-0 overflow-hidden"
                                    />
                                    <input
                                        type="text"
                                        value={newCatColor}
                                        onChange={(e) => setNewCatColor(e.target.value)}
                                        className="flex-1 bg-bg-input border border-border rounded-xl px-4 text-xs font-mono uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAddCategory}
                            disabled={!newCatName.trim()}
                            className="w-full py-4 bg-accent text-white font-bold rounded-2xl shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            ADICIONAR CATEGORIA
                        </button>
                    </div>

                    {/* List/Edit Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="glass-card p-4 group relative hover:border-accent/40 transition-all overflow-hidden">
                                {editingCatId === cat.id ? (
                                    <div className="space-y-3 animate-fade-in">
                                        <input
                                            autoFocus
                                            className="w-full bg-bg-input border border-border rounded-lg px-2 py-1 text-sm font-bold"
                                            value={cat.name}
                                            onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={cat.color}
                                                onChange={(e) => handleUpdateCategory(cat.id, { color: e.target.value })}
                                                className="w-8 h-8 rounded-lg"
                                            />
                                            <select
                                                value={cat.type}
                                                onChange={(e) => handleUpdateCategory(cat.id, { type: e.target.value as any })}
                                                className="flex-1 bg-bg-input border border-border rounded-lg px-2 py-1 text-xs"
                                            >
                                                <option value="income">Receita</option>
                                                <option value="expense">Despesa</option>
                                                <option value="both">Misto</option>
                                            </select>
                                        </div>
                                        <button onClick={() => setEditingCatId(null)} className="w-full py-1.5 bg-accent text-white rounded-lg text-xs font-bold">FEITO</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg" style={{ backgroundColor: cat.color }}>
                                                {cat.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight">{cat.name}</p>
                                                <p className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        cat.type === 'income' ? "bg-positive" : cat.type === 'expense' ? "bg-negative" : "bg-accent"
                                                    )} />
                                                    {cat.type === 'income' ? 'Receita' : cat.type === 'expense' ? 'Despesa' : 'Misto'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingCatId(cat.id)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 hover:bg-negative/10 text-negative rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'payments' && (
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Plus className="text-accent" /> Novo Meio de Pagamento
                        </h2>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newPayMethod}
                                onChange={(e) => setNewPayMethod(e.target.value)}
                                placeholder="Ex: Cartão Inter, Ticket..."
                                className="flex-1 bg-bg-input border border-border rounded-xl px-4 py-3 focus:border-accent transition-all"
                            />
                            <button
                                onClick={handleAddPaymentMethod}
                                className="px-8 bg-accent text-white font-bold rounded-xl shadow-xl shadow-accent/20"
                            >
                                ADICIONAR
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(settings.paymentMethods || []).map(method => (
                            <div key={method} className="glass-card p-4 group relative hover:border-accent/40 transition-all flex items-center justify-between">
                                {editingPayMethod === method ? (
                                    <div className="flex w-full gap-2 animate-fade-in">
                                        <input
                                            autoFocus
                                            className="flex-1 bg-bg-input border border-border rounded-lg px-2 py-1 text-sm font-bold"
                                            value={method}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingPayMethod(null)}
                                            onChange={(e) => handleUpdatePaymentMethod(method, e.target.value)}
                                        />
                                        <button onClick={() => setEditingPayMethod(null)} className="p-2 bg-accent text-white rounded-lg"><Check size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-accent/10 text-accent"><CreditCard size={18} /></div>
                                            <span className="font-bold text-sm tracking-tight">{method}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingPayMethod(method)} className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDeletePaymentMethod(method)} className="p-1.5 hover:bg-negative/10 text-negative rounded-lg"><Trash2 size={14} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="glass-card p-8 space-y-8">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                        <RefreshCcw size={24} className="text-positive" />
                        <h2 className="text-xl font-bold">Gestão de Dados Local</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={onExportData}
                            className="flex items-center gap-4 p-6 bg-white/5 border border-border rounded-2xl hover:bg-white/10 transition-all group"
                        >
                            <div className="p-3 rounded-xl bg-accent/20 text-accent group-hover:scale-110 transition-transform">
                                <Download size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold">Baixar Backup (JSON)</h3>
                                <p className="text-xs text-text-muted">Salve todos os seus lançamentos offline.</p>
                            </div>
                        </button>

                        <label className="flex items-center gap-4 p-6 bg-white/5 border border-border rounded-2xl hover:bg-white/10 transition-all group cursor-pointer">
                            <div className="p-3 rounded-xl bg-positive/20 text-positive group-hover:scale-110 transition-transform">
                                <Upload size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold">Restaurar Backup</h3>
                                <p className="text-xs text-text-muted">Suba um arquivo .json anteriormente baixado.</p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".json"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => onImportData(ev.target?.result as string);
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                        </label>

                        <button
                            onClick={() => setIsResetConfirm(true)}
                            className="col-span-full flex items-center justify-center gap-4 p-6 bg-negative/5 border border-negative/20 rounded-2xl hover:bg-negative/10 transition-all group text-negative"
                        >
                            <Trash2 size={24} className="group-hover:rotate-12 transition-transform" />
                            <div className="text-left">
                                <h3 className="font-bold">Limpar Todo o Banco de Dados</h3>
                                <p className="text-xs opacity-70">Aviso: Ação irreversível que apaga 100% dos dados locais.</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Extreme Reset Modal */}
            {isResetConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div onClick={() => setIsResetConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div className="relative glass-strong p-10 max-w-md w-full text-center space-y-8 border-negative/50 animate-scale-in">
                        <div className="w-20 h-20 bg-negative/20 text-negative rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-negative/40">
                            <AlertCircle size={40} />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">Você tem certeza?</h2>
                            <p className="text-text-secondary">Esta ação é <b>permanente</b>. Todos os seus dados de transações, orçamentos, metas e configurações serão deletados do armazenamento do seu navegador.</p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsResetConfirm(false)} className="flex-1 py-4 font-bold hover:bg-white/5 rounded-2xl transition-all">MANTER DADOS</button>
                            <button
                                onClick={() => { onResetData(); setIsResetConfirm(false); }}
                                className="flex-1 py-4 bg-negative text-white font-bold rounded-2xl shadow-2xl shadow-negative/50 hover:bg-red-600 transition-all"
                            >
                                SIM, APAGAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
