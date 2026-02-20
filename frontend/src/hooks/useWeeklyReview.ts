import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTransactions, updateTransaction } from '../services/transactionService';
import type { Transaction } from '../types';

export interface WeeklyReviewItem {
  transaction: Transaction;
  isConfirmed: boolean;
}

export function useWeeklyReview() {
  const { user } = useAuth();
  const [items, setItems] = useState<WeeklyReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inSevenDays = new Date(today);
      inSevenDays.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split('T')[0];
      const endStr = inSevenDays.toISOString().split('T')[0];

      const all = await getTransactions(user.uid, {
        startDate: todayStr,
        endDate: endStr,
      });

      const recurring = all.filter((t) => t.isRecurringInstance === true);

      setItems(
        recurring.map((t) => ({
          transaction: t,
          isConfirmed: !!t.confirmedAt,
        }))
      );
    } catch (err) {
      console.error('useWeeklyReview load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.transaction.id === id
            ? { ...item, isConfirmed: true, transaction: { ...item.transaction, confirmedAt: now } }
            : item
        )
      );
      try {
        await updateTransaction(id, { confirmedAt: now } as any);
      } catch (err) {
        console.error('confirm error:', err);
        // Revert optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.transaction.id === id
              ? { ...item, isConfirmed: false, transaction: { ...item.transaction, confirmedAt: undefined } }
              : item
          )
        );
      }
    },
    []
  );

  const editAmount = useCallback(
    async (id: string, newAmount: number) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.transaction.id === id
            ? { ...item, transaction: { ...item.transaction, amount: newAmount } }
            : item
        )
      );
      try {
        await updateTransaction(id, { amount: newAmount });
      } catch (err) {
        console.error('editAmount error:', err);
        load(); // Reload to recover correct state
      }
    },
    [load]
  );

  const pendingCount = items.filter((i) => !i.isConfirmed).length;

  return { items, loading, pendingCount, confirm, editAmount, reload: load };
}
