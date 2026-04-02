// =====================================================
// UTILS — Formatting and helper functions
// =====================================================

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatCurrencyShort(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `R$ ${(value / 1_000).toFixed(1)}k`;
    }
    return formatCurrency(value);
}

export function formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function parseCurrencyInput(raw: string): number {
    const cleaned = raw.replace(/[^\d]/g, '');
    return Number(cleaned) / 100;
}

export function formatCurrencyInput(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function cn(...classes: (string | undefined | false | null)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}
