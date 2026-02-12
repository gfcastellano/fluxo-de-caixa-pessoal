import type { Transaction, Account, Category, CreditCard } from '../types';

/**
 * Enriches raw transactions with related entity objects (Account, Category, CreditCard).
 * This centralizes the logic for joining related data across the application.
 */
export function enrichTransactions(
    transactions: Transaction[],
    accounts: Account[],
    categories: Category[],
    creditCards: CreditCard[]
): Transaction[] {
    // Create lookups for O(1) access
    const accountsMap = new Map(accounts.map((a) => [a.id, a]));
    const categoriesMap = new Map(categories.map((c) => [c.id, c]));
    const creditCardsMap = new Map(creditCards.map((c) => [c.id, c]));

    return transactions.map((transaction) => {
        // 1. Enrich Credit Card (and its linked account)
        let enrichedCreditCard: CreditCard | undefined = undefined;
        if (transaction.creditCardId) {
            const creditCardData = creditCardsMap.get(transaction.creditCardId);
            if (creditCardData) {
                enrichedCreditCard = {
                    ...creditCardData,
                    linkedAccount: creditCardData.linkedAccountId
                        ? accountsMap.get(creditCardData.linkedAccountId)
                        : undefined,
                };
            }
        }

        // 2. Return enriched transaction
        return {
            ...transaction,
            category: transaction.categoryId
                ? (categoriesMap.get(transaction.categoryId) || transaction.category)
                : transaction.category,
            account: transaction.accountId
                ? (accountsMap.get(transaction.accountId) || transaction.account)
                : transaction.account,
            toAccount: transaction.toAccountId
                ? (accountsMap.get(transaction.toAccountId) || transaction.toAccount)
                : transaction.toAccount,
            creditCard: enrichedCreditCard || transaction.creditCard,
        };
    });
}
