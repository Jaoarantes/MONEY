import React, { useState } from 'react';
import {
    LayoutDashboard, Receipt, PlusCircle, Target,
    BarChart3, Settings, PieChart, Menu, X,
    Sun, Moon, ChevronRight, LogOut
} from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageName, AppSettings } from './types';

interface SidebarProps {
    currentPage: PageName;
    onPageChange: (page: PageName) => void;
    settings: AppSettings;
    onToggleTheme: () => void;
}

const MENU_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', icon: Receipt },
    { id: 'add', label: 'Novo Lançamento', icon: PlusCircle },
    { id: 'budgets', label: 'Orçamentos', icon: PieChart },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Ajustes', icon: Settings },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
    currentPage, onPageChange, settings, onToggleTheme
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-strong z-40 px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold">M</div>
                    <span className="font-bold tracking-tight">MONEY</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            className="absolute inset-y-0 left-0 w-80 bg-bg-surface border-r border-border p-6 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-bold">M</div>
                                    <span className="font-bold text-xl tracking-tight">MONEY</span>
                                </div>
                                <button onClick={() => setIsMobileMenuOpen(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex-1 space-y-2">
                                {MENU_ITEMS.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            onPageChange(item.id as PageName);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
                                            currentPage === item.id
                                                ? "bg-accent text-white shadow-lg shadow-accent/20"
                                                : "hover:bg-white/5 text-text-secondary"
                                        )}
                                    >
                                        <item.icon size={22} />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-border space-y-4">
                                <button
                                    onClick={onToggleTheme}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 text-text-secondary"
                                >
                                    {settings.theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
                                    <span>{settings.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                animate={{ width: isCollapsed ? 88 : 280 }}
                className="hidden lg:flex flex-col fixed inset-y-0 left-0 bg-bg-surface border-r border-border z-40 overflow-hidden"
            >
                <div className="p-6 mb-4 flex items-center justify-between">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                        >
                            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-bold shadow-lg shadow-accent/20">M</div>
                            <span className="font-bold text-xl tracking-tight">MONEY</span>
                        </motion.div>
                    )}
                    {isCollapsed && (
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white font-bold mx-auto">M</div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {MENU_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onPageChange(item.id as PageName)}
                            className={cn(
                                "w-full flex items-center rounded-xl transition-all duration-300 relative group overflow-hidden h-12",
                                currentPage === item.id
                                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                                    : "hover:bg-white/5 text-text-secondary"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center min-w-[56px]",
                                isCollapsed ? "w-full" : ""
                            )}>
                                <item.icon size={22} />
                            </div>
                            {!isCollapsed && (
                                <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                                    {item.label}
                                </span>
                            )}
                            {currentPage === item.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={onToggleTheme}
                        className={cn(
                            "w-full flex items-center h-12 rounded-xl hover:bg-white/5 text-text-secondary transition-all",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <div className="min-w-[56px] flex items-center justify-center">
                            {settings.theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
                        </div>
                        {!isCollapsed && <span>{settings.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
                    </button>

                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "w-full flex items-center h-12 rounded-xl hover:bg-white/5 text-text-secondary transition-all",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <div className="min-w-[56px] flex items-center justify-center">
                            <ChevronRight className={cn("transition-transform duration-300", !isCollapsed && "rotate-180")} size={22} />
                        </div>
                        {!isCollapsed && <span>Recolher</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Content Spacer */}
            <div
                className="hidden lg:block transition-all duration-300"
                style={{ width: isCollapsed ? 88 : 280 }}
            />
        </>
    );
};
