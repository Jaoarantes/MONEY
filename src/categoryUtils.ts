import type { Category, Transaction } from './types';

export type ResolvedCategory = Pick<Category, 'id' | 'name' | 'color'>;

export const normalizeCategoryValue = (value?: string) =>
    value
        ?.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();

export const getTransactionCategoryId = (transaction: Transaction) =>
    transaction.category?.id || transaction.categoryId?.toString();

export const isCategoryAvailableForTransaction = (
    category: Category,
    type: Transaction['type']
) => category.type === type || category.type === 'both';

export const resolveTransactionCategory = (
    transaction: Transaction,
    categories: Category[]
): ResolvedCategory | undefined => {
    const categoryId = getTransactionCategoryId(transaction);
    const categoryById = categories.find((category) =>
        category.id?.toString() === categoryId
    );

    if (categoryById) {
        return categoryById;
    }

    if (transaction.category?.name) {
        return transaction.category;
    }

    const normalizedCategory = normalizeCategoryValue(transaction.categoryId);

    return categories.find((category) =>
        normalizeCategoryValue(category.name) === normalizedCategory
    );
};

