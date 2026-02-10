# Fix Plan: Recurring Transactions

## Problem Summary

The current system creates recurring transactions incorrectly:
1. Does not correctly calculate the total number of installments (`totalInstallments`)
2. The parent transaction does not have `installmentNumber` or `totalInstallments`
3. The child instance numbering is incorrect

## User Requirements

1. **Single Creation**: When a recurring transaction is created, generate ALL instances at once (not lazy loading)
2. **Correct Count**: If it's monthly and ends in 2 months, there should be exactly 2 transactions in total
3. **Display in "All" Filter**: Show all transactions with "X of Y" (e.g., "1 of 2", "2 of 2")
4. **Display in Monthly Filter**: Show only the month's transactions with absolute "X of Y"

## Expected Example

Monthly transaction created on 02/09/2026, ending on 04/09/2026:
- Total transactions: 3 (Feb, Mar, Apr)
- "All" Filter: Shows 3 transactions - "1 of 3", "2 of 3", "3 of 3"
- "Feb/2026" Filter: Shows 1 transaction - "1 of 3"
- "Mar/2026" Filter: Shows 1 transaction - "2 of 3"
- "Apr/2026" Filter: Shows 1 transaction - "3 of 3"

## Issues Found in Current Code

### 1. Backend: `backend/src/routes/transactions.ts`

**Issue in `generateRecurringInstancesWithCount` function (line 222):**
```typescript
totalInstallments: count, // WRONG: count is recurringCount - 1
```
If `recurringCount = 3`, then `count = 2`, and `totalInstallments = 2` (should be 3)

**Issue in parent transaction creation (line 61-66):**
The parent transaction does not receive `installmentNumber` or `totalInstallments`

**Issue in `generateRecurringInstances` function (line 236-301):**
Does not set `installmentNumber` or `totalInstallments` on instances

### 2. Frontend: `frontend/src/pages/Transactions.tsx`

The "X of Y" display depends on `installmentNumber` and `totalInstallments` fields which are incorrect or missing.

## Required Fixes

### Backend - `backend/src/routes/transactions.ts`

#### 1. Fix parent transaction creation (POST /)

```typescript
// Calculate total installments if recurringCount exists
const totalInstallments = recurringCount || 
  (validated.recurrenceEndDate ? calculateFromEndDate(validated) : 1);

const transaction = await firebase.createDocument('transactions', {
  ...transactionData,
  userId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // If recurring, add first installment metadata
  ...(validated.isRecurring ? {
    installmentNumber: 1,
    totalInstallments: totalInstallments,
  } : {}),
});
```

#### 2. Fix `generateRecurringInstancesWithCount`

```typescript
async function generateRecurringInstancesWithCount(
  firebase: FirebaseService,
  parentTransaction: { id: string; date: string; isRecurring?: boolean; recurrencePattern?: string; recurrenceDay?: number | null; recurrenceEndDate?: string | null; userId: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string; accountId?: string },
  data: { recurrencePattern?: string | null; recurrenceDay?: number | null; recurrenceEndDate?: string | null; date: string },
  count: number  // This is the number of ADDITIONAL instances to create
): Promise<unknown[]> {
  const instances: unknown[] = [];
  const startDate = new Date(parentTransaction.date);
  const recurrencePattern = data.recurrencePattern || 'monthly';
  const recurrenceDay = data.recurrenceDay;

  // Total in series includes parent transaction + instances to be created
  const totalInSeries = count + 1;

  let currentDate = new Date(startDate);

  // Create exactly 'count' instances
  for (let i = 0; i < count && i < MAX_INSTANCES_PER_REQUEST; i++) {
    // Move to next occurrence
    currentDate = getNextDate(currentDate, recurrencePattern, recurrenceDay);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Check if instance already exists for this date
    const existingInstances = await firebase.queryDocuments('transactions', [
      { field: 'parentTransactionId', op: '==', value: parentTransaction.id },
      { field: 'date', op: '==', value: dateStr },
    ]);
```

#### 3. Fix instance creation

```typescript
const instance = {
  ...parentTransaction,
  id: undefined, // Let Firestore generate
  parentTransactionId: parentTransaction.id,
  isRecurringInstance: true,
  installmentNumber: i + 2, // Parent is 1, so instances start at 2
  totalInstallments: totalInSeries,
  date: dateStr,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

#### 4. Fix `generateRecurringInstances` (by end date)

```typescript
// Calculate total installments
const totalInSeries = instances.length + 1; // +1 for parent

// Update parent with totalInstallments
await firebase.updateDocument('transactions', parentTransaction.id, {
  totalInstallments: totalInSeries,
});

// Set totalInstallments on all instances
for (const instance of instances) {
  instance.totalInstallments = totalInSeries;
}
```

### Frontend - `frontend/src/pages/Transactions.tsx`

#### 1. Fix display "X of Y"

```typescript
// In the transaction list rendering
{transaction.installmentNumber && transaction.totalInstallments && (
  <span className="text-sm text-gray-500">
    {transaction.installmentNumber} {t('of')} {transaction.totalInstallments}
  </span>
)}
```

## Files to Modify

### Backend
- `backend/src/routes/transactions.ts`
- `backend/src/types/index.ts` (if type changes needed)

### Frontend
- `frontend/src/pages/Transactions.tsx`
- `frontend/src/types/index.ts` (if type changes needed)

## Testing

1. Create a monthly recurring transaction with 3 installments
2. Verify 3 transactions are created
3. Verify parent has: `installmentNumber: 1`, `totalInstallments: 3`
4. Verify instances have: `installmentNumber: 2, 3`, `totalInstallments: 3`
5. Check "All" filter shows "1 of 3", "2 of 3", "3 of 3"
6. Check monthly filter shows correct "X of Y" for each month

## Related Documents

- `recurring-transactions-validation.md` - Testing and validation guide
- `recurring-edit-modes.md` - Bulk editing specification
- `IMPLEMENTATION_SUMMARY.md` - Implementation summary
