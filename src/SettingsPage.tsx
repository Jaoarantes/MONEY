import React, { useState } from 'react';
import {
    Settings as SettingsIcon, Trash2, Download,
    Upload, Moon, Sun, Calendar, Plus,
    X, Check, Save, AlertCircle, RefreshCcw
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
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#6C63FF');
    const [isResetConfirm, setIsResetConfirm] = useState(false);

    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        const newCat: Category = {
            id: crypto.randomUUID(),
            name: newCatName,
            type: 'expense',
            icon: 'Tag',
            color: newCatColor
        };
        onUpdateCategories([...categories, newCat]);
        setNewCatName('');
    };

    const handleDeleteCategory = (id: string) => {
        onUpdateCategories(categories.filter(c => c.id !== id));
    };

    return (
        <div className="max-w-4xl space-y-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Configurações</h1>
                <p className="text-text-secondary">Gerencie suas preferências e dados do aplicativo.</p>
            </div>

            {/* App Preferences */}
            <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <SettingsIcon size={20} className="text-accent" />
                    <h2 className="text-xl font-bold">Geral</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Início do Mês Financeiro</label>
                        <div className="flex items-center gap-4">
                            <Calendar size={18} className="text-text-muted" />
                            <select
                                value={settings.monthStart}
                                onChange={(e) => onUpdateSettings({ ...settings, monthStart: Number(e.target.value) })}
                                className="flex-1 bg-bg-input border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-accent transition-all"
                            >
                                {Array.from({ length: 31 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>Dia {i + 1}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-text-muted">Os cálculos mensais começarão a partir deste dia.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-secondary">Tema Visual</label>
                        <div className="flex p-1 bg-bg-input border border-border rounded-xl">
                            <button
                                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all",
                                    settings.theme === 'light' ? "bg-white text-black shadow-lg" : "text-text-muted"
                                )}
                            >
                                <Sun size={18} /> Claro
                            </button>
                            <button
                                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all",
                                    settings.theme === 'dark' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted"
                                )}
                            >
                                <Moon size={18} /> Escuro
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categories Management */}
            <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Plus size={20} className="text-accent" />
                    <h2 className="text-xl font-bold">Categorias</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-input border border-border group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-2 opacity-0 group-hover:opacity-100 hover:text-negative transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-border flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nova categoria..."
                        className="flex-1 bg-bg-input border border-border rounded-xl px-4 py-2 focus:outline-none focus:border-accent"
                    />
                    <div className="flex gap-2">
                        {['#6C63FF', '#00D9A6', '#FF4D6D', '#FFB830', '#A855F7', '#34D399'].map(c => (
                            <button
                                key={c}
                                onClick={() => setNewCatColor(c)}
                                className={cn("w-8 h-8 rounded-full border-2", newCatColor === c ? "border-white" : "border-transparent")}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleAddCategory}
                        className="bg-accent text-white font-bold px-6 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        ADICIONAR
                    </button>
                </div>
            </div>

            {/* Data Management */}
            <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <RefreshCcw size={20} className="text-accent" />
                    <h2 className="text-xl font-bold">Dados e Backup</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={onExportData}
                        className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-border rounded-2xl hover:bg-white/10 transition-all font-bold group"
                    >
                        <Download className="text-accent group-hover:-translate-y-1 transition-transform" />
                        BAIXAR JSON
                    </button>

                    <label className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-border rounded-2xl hover:bg-white/10 transition-all font-bold cursor-pointer group">
                        <Upload className="text-positive group-hover:-translate-y-1 transition-transform" />
                        IMPORTAR JSON
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
                        className="flex items-center justify-center gap-3 p-4 bg-negative/10 border border-negative/20 text-negative rounded-2xl hover:bg-negative/20 transition-all font-bold"
                    >
                        <Trash2 />
                        ZERAR TUDO
                    </button>
                </div>
            </div>

            {/* Modal Confirmação de Reset */}
            {isResetConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div onClick={() => setIsResetConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                    <div className="relative glass-strong p-8 max-w-sm w-full text-center space-y-6 border-negative/50">
                        <div className="w-16 h-16 bg-negative/20 text-negative rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">Certeza absoluta?</h2>
                            <p className="text-text-secondary text-sm">Esta ação apagará todas as suas transações, metas e categorias para sempre. Não há volta!</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setIsResetConfirm(false)} className="flex-1 py-3 font-bold hover:bg-white/5 rounded-xl">CANCELAR</button>
                            <button
                                onClick={() => { onResetData(); setIsResetConfirm(false); }}
                                className="flex-1 py-3 bg-negative text-white font-bold rounded-xl shadow-lg shadow-negative/20"
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
