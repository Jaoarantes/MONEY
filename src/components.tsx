import React from 'react';
import {
    TrendingUp, TrendingDown, Wallet, PiggyBank,
    ChevronUp, ChevronDown, MoreVertical, Trash2, Edit2,
    X, Check, AlertCircle, Loader2
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatCurrency, cn } from './utils';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== KPI CARD ====================
interface KPICardProps {
    title: string;
    value: number;
    variation: number;
    icon: React.ReactNode;
    color: 'accent' | 'positive' | 'negative' | 'warning';
    sparklineData: any[];
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, variation, icon, color, sparklineData }) => {
    const isPositive = variation >= 0;

    const colorMap = {
        accent: 'text-accent glow-accent',
        positive: 'text-positive glow-positive',
        negative: 'text-negative glow-negative',
        warning: 'text-warning glow-warning',
    };

    const bgGlowMap = {
        accent: 'bg-accent/10',
        positive: 'bg-positive/10',
        negative: 'bg-negative/10',
        warning: 'bg-warning/10',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group"
        >
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${bgGlowMap[color]} ${colorMap[color]}`}>
                    {icon}
                </div>
                <div className="h-10 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="balance"
                                stroke={`var(--color-${color})`}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div>
                <p className="text-text-secondary text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold font-numbers mt-1">{formatCurrency(value)}</h3>
            </div>

            <div className="flex items-center gap-1.5 text-sm">
                <span className={cn(
                    "flex items-center font-medium",
                    isPositive ? "text-positive" : "text-negative"
                )}>
                    {isPositive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {Math.abs(variation).toFixed(1)}%
                </span>
                <span className="text-text-muted text-xs">vs mês anterior</span>
            </div>

            <div className={`absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-10 transition-opacity duration-500 text-6xl ${colorMap[color]}`}>
                {icon}
            </div>
        </motion.div>
    );
};

// ==================== CHART WRAPPER ====================
interface ChartCardProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, children, className }) => (
    <div className={cn("glass-card p-6 flex flex-col gap-6", className)}>
        <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
        </div>
        <div className="flex-1 w-full min-h-[300px]">
            {children}
        </div>
    </div>
);

// ==================== PROGRESS BAR ====================
interface ProgressBarProps {
    value: number;
    max: number;
    color?: string;
    label?: string;
    showPercent?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value, max, color = 'var(--color-accent)', label, showPercent
}) => {
    const percent = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end text-sm">
                {label && <span className="text-text-secondary">{label}</span>}
                {showPercent && <span className="font-numbers text-text-primary">{percent.toFixed(0)}%</span>}
            </div>
            <div className="h-2 w-full bg-bg-surface rounded-full overflow-hidden border border-border">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
                />
            </div>
        </div>
    );
};

// ==================== MODAL ====================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative glass-strong w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

// ==================== CATEGORY BADGE ====================
export const CategoryBadge: React.FC<{ name: string; color: string }> = ({ name, color }) => (
    <span
        className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
        style={{ backgroundColor: `${color}20`, color: color, border: `1px solid ${color}40` }}
    >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {name}
    </span>
);

// ==================== TOAST ====================
export const ToastContainer: React.FC<{ toasts: any[], onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
            {toasts.map((toast) => (
                <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className={cn(
                        "glass-strong p-4 rounded-xl shadow-xl border-l-4 flex items-center gap-3 min-w-[300px]",
                        toast.type === 'success' ? "border-positive" : "border-negative"
                    )}
                >
                    {toast.type === 'success' ?
                        <Check className="text-positive" size={20} /> :
                        <AlertCircle className="text-negative" size={20} />
                    }
                    <p className="text-sm font-medium">{toast.message}</p>
                    <button onClick={() => onRemove(toast.id)} className="ml-auto text-text-muted hover:text-text-primary">
                        <X size={16} />
                    </button>
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);

// ==================== EMPTY STATE ====================
export const EmptyState: React.FC<{ message?: string }> = ({ message = "Nenhum dado encontrado" }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center text-text-muted opacity-50">
        <div className="p-4 rounded-full bg-white/5 mb-4">
            <AlertCircle size={48} />
        </div>
        <p className="text-lg font-medium">{message}</p>
    </div>
);

// ==================== LOADER ====================
export const Loader: React.FC = () => (
    <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-accent" size={32} />
    </div>
);
