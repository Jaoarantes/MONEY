import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { AuthPage } from './AuthPage';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { TransactionsPage } from './TransactionsPage';
import { AddTransaction } from './AddTransaction';
import { BudgetsPage } from './BudgetsPage';
import { GoalsPage } from './GoalsPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';
import { ToastContainer, Loader } from './components';
import {
  useTransactions, useCategories, useBudgets,
  useGoals, useFinancialSummary, useSettings, useToast
} from './hooks';
import type { PageName, Transaction } from './types';
import { cn } from './utils';
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Month/Year navigation for Dashboard
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { settings, setSettings, toggleTheme } = useSettings();
  const { transactions, loading: txLoading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, loading: catLoading, addCategory, updateCategory, deleteCategory, seedInitialCategories } = useCategories();
  const { budgets, loading: budLoading, addBudget, updateBudget, deleteBudget, initBudgets } = useBudgets();
  const { goals, loading: goalLoading, addContribution, addGoal, deleteGoal, updateGoal } = useGoals();
  const { toasts, addToast, removeToast } = useToast();

  const summary = useFinancialSummary(transactions, selectedMonth, selectedYear);

  // Filter transactions to the selected month for Dashboard display
  const dashboardTransactions = React.useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Initialize categories and budgets if empty (seeding for new users)
  useEffect(() => {
    if (!catLoading && categories.length === 0) {
      seedInitialCategories();
    }
  }, [categories.length, catLoading, seedInitialCategories]);


  // Handle data storage resets / imports
  const handleReset = async () => {
    // For Supabase, we should probably delete from tables. 
    // For now, keep it simple or just clear local storage settings.
    localStorage.clear();
    addToast('info', 'Configurações locais resetadas. Para apagar dados do banco, use o painel Supabase.');
  };

  const handleExport = () => {
    const data = {
      transactions,
      categories,
      budgets,
      goals,
      settings,
      version: '2.0.0 (SQL)',
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money_backup_sql_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addToast('success', 'Backup exportado com sucesso!');
  };

  const handleAddTransaction = async (tx: any) => {
    if (editingTransaction) {
      const success = await updateTransaction(editingTransaction.id, tx);
      if (success) {
        addToast('success', 'Lançamento atualizado!');
        setEditingTransaction(null);
        setCurrentPage('transactions');
      }
    } else {
      const success = await addTransaction(tx);
      if (success) {
        addToast('success', 'Lançamento registrado!');
        setCurrentPage('dashboard');
      }
    }
  };

  const renderPage = () => {
    if (txLoading || catLoading || budLoading || goalLoading) {
      return <div className="flex h-[60vh] items-center justify-center"><Loader /></div>;
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            summary={summary}
            transactions={dashboardTransactions}
            categories={categories}
            goals={goals}
            budgets={budgets}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        );
      case 'transactions':
        return (
          <TransactionsPage
            transactions={dashboardTransactions}
            categories={categories}
            onDelete={(id) => { deleteTransaction(id); addToast('info', 'Transação excluída.'); }}
            onEdit={(tx) => { setEditingTransaction(tx); setCurrentPage('add'); }}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        );
      case 'add':
        return (
          <AddTransaction
            categories={categories}
            paymentMethods={settings.paymentMethods}
            onSubmit={handleAddTransaction}
            initialData={editingTransaction || undefined}
            onCancel={editingTransaction ? () => { setEditingTransaction(null); setCurrentPage('transactions'); } : undefined}
          />
        );
      case 'budgets':
        return (
          <BudgetsPage
            budgets={budgets}
            categories={categories}
            transactions={transactions}
            onAddBudget={(b) => { addBudget(b); addToast('success', 'Orçamento criado!'); }}
            onUpdateBudget={(id, b) => { updateBudget(id, b); addToast('success', 'Orçamento atualizado!'); }}
            onDeleteBudget={(id) => { deleteBudget(id); addToast('info', 'Orçamento removido.'); }}
          />
        );
      case 'goals':
        return (
          <GoalsPage
            goals={goals}
            onAddGoal={(g) => { addGoal(g); addToast('success', 'Meta criada!'); }}
            onUpdateGoal={(id, g) => { updateGoal(id, g); addToast('success', 'Meta atualizada!'); }}
            onDeleteGoal={(id) => { deleteGoal(id); addToast('info', 'Meta removida.'); }}
            onAddContribution={(id, amount) => { addContribution(id, amount); addToast('success', 'Aporte registrado com sucesso!'); }}
          />
        );
      case 'reports':
        return <ReportsPage transactions={transactions} categories={categories} />;
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            categories={categories}
            onUpdateSettings={setSettings}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onExportData={handleExport}
            onImportData={(str) => addToast('warning', 'Importação direta para SQL ainda em desenvolvimento.')}
            onResetData={handleReset}
          />
        );
      default:
        return (
          <Dashboard
            summary={summary}
            transactions={dashboardTransactions}
            categories={categories}
            goals={goals}
            budgets={budgets}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        );
    }
  };

  if (authLoading) return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><Loader /></div>;
  if (!session) return <AuthPage />;

  return (
    <div className={cn(
      "min-h-screen flex bg-bg-primary text-text-primary transition-colors duration-300",
      settings.theme === 'light' ? 'theme-light' : ''
    )}>
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        settings={settings}
        userEmail={session.user.email}
        onToggleTheme={toggleTheme}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="flex-1 min-w-0 flex flex-col pt-16 lg:pt-0">
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {renderPage()}
        </div>

        <footer className="p-8 mt-12 border-t border-border/50 text-center text-text-muted text-xs no-print">
          <p>© 2026 Money — Luxury Dark Finance Interface. Build for Enterprise Scale.</p>
        </footer>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
