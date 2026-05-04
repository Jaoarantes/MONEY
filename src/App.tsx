import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
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
  const [session, setSession] = useState<Session | null>(null);
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
  const { budgets, loading: budLoading, addBudget, updateBudget, deleteBudget } = useBudgets();
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

  const handleImport = async (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const importedCategories = Array.isArray(parsed.categories) ? parsed.categories as Record<string, unknown>[] : [];
      const importedTransactions = Array.isArray(parsed.transactions) ? parsed.transactions as Record<string, unknown>[] : [];
      const importedBudgets = Array.isArray(parsed.budgets) ? parsed.budgets as Record<string, unknown>[] : [];
      const importedGoals = Array.isArray(parsed.goals) ? parsed.goals as Record<string, unknown>[] : [];

      const categoryRows = importedCategories.map((category) => ({
        id: category.id,
        user_id: user.id,
        name: category.name,
        type: category.type,
        icon: category.icon || 'Tag',
        color: category.color || '#6C63FF',
        budget: category.budget ?? null
      }));

      const transactionRows = importedTransactions.map((tx) => ({
        id: tx.id,
        user_id: user.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        category: tx.categoryId || tx.category,
        date: tx.date,
        recurrent: tx.recurrent || false,
        recurrence_frequency: tx.recurrenceFrequency || tx.recurrence_frequency,
        payment_method: tx.paymentMethod || tx.payment_method,
        notes: tx.notes
      }));

      const budgetRows = importedBudgets.map((budget) => ({
        id: budget.id,
        user_id: user.id,
        category_id: budget.categoryId || budget.category_id,
        month: budget.month,
        limit: budget.limit,
        spent: budget.spent || 0
      }));

      const goalRows = importedGoals.map((goal) => ({
        id: goal.id,
        user_id: user.id,
        name: goal.name,
        target_amount: goal.targetAmount || goal.target_amount,
        current_amount: goal.currentAmount || goal.current_amount || 0,
        deadline: goal.deadline,
        category: goal.categoryId || goal.category || null,
        color: goal.color || '#6C63FF'
      }));

      if (categoryRows.length) await supabase.from('categories').upsert(categoryRows);
      if (transactionRows.length) await supabase.from('transactions').upsert(transactionRows);
      if (budgetRows.length) await supabase.from('budgets').upsert(budgetRows);
      if (goalRows.length) await supabase.from('goals').upsert(goalRows);
      if (parsed.settings && typeof parsed.settings === 'object') setSettings(parsed.settings as typeof settings);

      addToast('success', 'Backup importado. Recarregando dados...');
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error('Import error:', error);
      addToast('error', 'Não foi possível importar este backup.');
    }
  };

  const handleAddTransaction = async (tx: Omit<Transaction, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>) => {
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
            onDelete={async (id) => {
              if (!window.confirm('Excluir esta transação?')) return;
              const success = await deleteTransaction(id);
              addToast(success ? 'info' : 'error', success ? 'Transação excluída.' : 'Não foi possível excluir a transação.');
            }}
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
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onAddBudget={async (b) => {
              const budget = await addBudget(b);
              addToast(budget ? 'success' : 'error', budget ? 'Orçamento criado!' : 'Não foi possível criar o orçamento.');
            }}
            onUpdateBudget={async (id, b) => {
              const budget = await updateBudget(id, b);
              addToast(budget ? 'success' : 'error', budget ? 'Orçamento atualizado!' : 'Não foi possível atualizar o orçamento.');
            }}
            onDeleteBudget={async (id) => {
              if (!window.confirm('Excluir este orçamento?')) return;
              const success = await deleteBudget(id);
              addToast(success ? 'info' : 'error', success ? 'Orçamento removido.' : 'Não foi possível remover o orçamento.');
            }}
          />
        );
      case 'goals':
        return (
          <GoalsPage
            goals={goals}
            onAddGoal={async (g) => {
              const goal = await addGoal(g);
              addToast(goal ? 'success' : 'error', goal ? 'Meta criada!' : 'Não foi possível criar a meta.');
            }}
            onUpdateGoal={async (id, g) => {
              const goal = await updateGoal(id, g);
              addToast(goal ? 'success' : 'error', goal ? 'Meta atualizada!' : 'Não foi possível atualizar a meta.');
            }}
            onDeleteGoal={async (id) => {
              if (!window.confirm('Excluir esta meta?')) return;
              const success = await deleteGoal(id);
              addToast(success ? 'info' : 'error', success ? 'Meta removida.' : 'Não foi possível remover a meta.');
            }}
            onAddContribution={async (id, amount) => {
              const goal = await addContribution(id, amount);
              addToast(goal ? 'success' : 'error', goal ? 'Aporte registrado com sucesso!' : 'Não foi possível registrar o aporte.');
            }}
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
            onImportData={handleImport}
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
          <p>© 2026 Money — Finanças pessoais com clareza.</p>
        </footer>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
