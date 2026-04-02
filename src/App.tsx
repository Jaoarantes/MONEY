import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { TransactionsPage } from './TransactionsPage';
import { AddTransaction } from './AddTransaction';
import { BudgetsPage } from './BudgetsPage';
import { GoalsPage } from './GoalsPage';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';
import { ToastContainer } from './components';
import {
  useTransactions, useCategories, useBudgets,
  useGoals, useFinancialSummary, useSettings, useToast
} from './hooks';
import type { PageName, Transaction } from './types';
import { cn } from './utils';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const { settings, setSettings, toggleTheme } = useSettings();
  const { transactions, addTransaction, updateTransaction, deleteTransaction, setTransactions } = useTransactions();
  const { categories, setCategories } = useCategories();
  const { budgets, addBudget, updateBudget, deleteBudget, setBudgets, initBudgets } = useBudgets();
  const { goals, addContribution, addGoal, deleteGoal, updateGoal, setGoals } = useGoals();
  const { toasts, addToast, removeToast } = useToast();

  const summary = useFinancialSummary(transactions);

  // Initialize budgets if empty (seeding)
  useEffect(() => {
    if (categories.length > 0 && budgets.length === 0) {
      initBudgets(categories);
    }
  }, [categories, budgets.length, initBudgets]);

  // Handle data storage resets / imports
  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleExport = () => {
    const data = {
      transactions,
      categories,
      budgets,
      goals,
      settings,
      version: '1.0.0',
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addToast('success', 'Backup exportado com sucesso!');
  };

  const handleImport = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) setTransactions(data.transactions);
      if (data.categories) setCategories(data.categories);
      if (data.budgets) setBudgets(data.budgets);
      if (data.goals) setGoals(data.goals);
      if (data.settings) setSettings(data.settings);
      addToast('success', 'Dados importados com sucesso!');
    } catch (e) {
      addToast('error', 'Falha ao importar arquivo JSON inválido.');
    }
  };

  const handleAddTransaction = (tx: any) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, tx);
      addToast('success', 'Lançamento atualizado!');
      setEditingTransaction(null);
      setCurrentPage('transactions');
    } else {
      addTransaction(tx);
      addToast('success', 'Lançamento registrado!');
      setCurrentPage('dashboard');
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard summary={summary} transactions={transactions} categories={categories} goals={goals} budgets={budgets} />;
      case 'transactions':
        return (
          <TransactionsPage
            transactions={transactions}
            categories={categories}
            onDelete={(id) => { deleteTransaction(id); addToast('info', 'Transação excluída.'); }}
            onEdit={(tx) => { setEditingTransaction(tx); setCurrentPage('add'); }}
          />
        );
      case 'add':
        return (
          <AddTransaction
            categories={categories}
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
            onUpdateCategories={setCategories}
            onExportData={handleExport}
            onImportData={handleImport}
            onResetData={handleReset}
          />
        );
      default:
        return <Dashboard summary={summary} transactions={transactions} categories={categories} goals={goals} budgets={budgets} />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex bg-bg-primary text-text-primary transition-colors duration-300",
      settings.theme === 'light' ? 'theme-light' : ''
    )}>
      {/* Sidebar - Fixed Positioned in component */}
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        settings={settings}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col pt-16 lg:pt-0">
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {renderPage()}
        </div>

        {/* Footer */}
        <footer className="p-8 mt-12 border-t border-border/50 text-center text-text-muted text-xs no-print">
          <p>© 2026 Money — Luxury Dark Finance Interface. Build for Enterprise Scale.</p>
        </footer>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
