import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import type { SharingPermissions } from '../types/family';
import { DEFAULT_SHARING_PERMISSIONS } from '../types/family';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

// Helper: Get sharing configs where targetUserId is the current user
async function getSharingForUser(
    firebase: FirebaseService,
    familyId: string,
    userId: string
) {
    return firebase.queryDocuments('familySharing', [
        { field: 'familyId', op: '==', value: familyId },
        { field: 'targetUserId', op: '==', value: userId },
    ]);
}

// Helper: Verify user membership
async function verifyMembership(
    firebase: FirebaseService,
    familyId: string,
    userId: string
) {
    const memberships = await firebase.queryDocuments('familyMembers', [
        { field: 'familyId', op: '==', value: familyId },
        { field: 'userId', op: '==', value: userId },
        { field: 'status', op: '==', value: 'active' },
    ]);
    return memberships.length > 0;
}

// GET /family-data/:familyId/summary — Overview of shared data
app.get('/:familyId/summary', async (c) => {
    try {
        const familyId = c.req.param('familyId');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        if (!(await verifyMembership(firebase, familyId, userId))) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        // Get what's shared with me
        const sharingConfigs = await getSharingForUser(firebase, familyId, userId);

        const result = [];

        for (const config of sharingConfigs) {
            const sharing = config as {
                ownerUserId: string;
                ownerDisplayName: string;
                permissions: SharingPermissions;
            };

            const memberData: Record<string, unknown> = {
                ownerUserId: sharing.ownerUserId,
                ownerDisplayName: sharing.ownerDisplayName,
            };

            const perms = sharing.permissions;

            // Accounts
            if (perms.accounts && (perms.accounts.shareAll || (perms.accounts.specificIds && perms.accounts.specificIds.length > 0))) {
                const accounts = await firebase.getDocuments('accounts', sharing.ownerUserId);
                memberData.accounts = (accounts as Array<Record<string, unknown>>).map((acc) => {
                    const shared: Record<string, unknown> = {
                        id: acc.id,
                        name: acc.name,
                        currency: acc.currency,
                        isCash: acc.isCash,
                        color: acc.color,
                        type: acc.type,
                        icon: acc.icon,
                        ownerName: sharing.ownerDisplayName,
                        ownerUserId: sharing.ownerUserId,
                    };
                    if (perms.accounts.showBalance) shared.balance = acc.balance;
                    return shared;
                });
            }

            // Credit Cards
            if (perms.creditCards && (perms.creditCards.shareAll || (perms.creditCards.specificIds && perms.creditCards.specificIds.length > 0))) {
                const cards = await firebase.getDocuments('creditCards', sharing.ownerUserId);
                memberData.creditCards = (cards as Array<Record<string, unknown>>).map((card) => {
                    const shared: Record<string, unknown> = {
                        id: card.id,
                        name: card.name,
                        color: card.color,
                        ownerName: sharing.ownerDisplayName,
                        ownerUserId: sharing.ownerUserId,
                    };
                    if (perms.creditCards.showLimit) shared.creditLimit = card.creditLimit;
                    if (perms.creditCards.showAvailable) {
                        shared.available = (card.creditLimit as number || 0) - (card.currentBillTotal as number || 0);
                    }
                    if (perms.creditCards.showBillTotal) shared.billTotal = card.currentBillTotal;
                    return shared;
                });
            }

            // Budgets
            if (perms.budgets && (perms.budgets.shareAll || (perms.budgets.specificIds && perms.budgets.specificIds.length > 0))) {
                const budgets = await firebase.getDocuments('budgets', sharing.ownerUserId);
                memberData.budgets = (budgets as Array<Record<string, unknown>>).map((budget) => {
                    const shared: Record<string, unknown> = {
                        id: budget.id,
                        categoryName: budget.categoryName || budget.name,
                        amount: budget.amount,
                        ownerName: sharing.ownerDisplayName,
                        ownerUserId: sharing.ownerUserId,
                    };
                    if (perms.budgets.showSpent) shared.spent = budget.spent;
                    if (perms.budgets.showRemaining) shared.remaining = (budget.amount as number || 0) - (budget.spent as number || 0);
                    return shared;
                });
            }

            result.push(memberData);
        }

        return c.json({ success: true, data: result });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch family data' }, 500);
    }
});

// GET /family-data/:familyId/accounts — Shared accounts detail
app.get('/:familyId/accounts', async (c) => {
    try {
        const familyId = c.req.param('familyId');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        if (!(await verifyMembership(firebase, familyId, userId))) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        const sharingConfigs = await getSharingForUser(firebase, familyId, userId);
        const accounts = [];

        for (const config of sharingConfigs) {
            const sharing = config as {
                ownerUserId: string;
                ownerDisplayName: string;
                permissions: SharingPermissions;
            };

            const perms = sharing.permissions;
            if (!perms.accounts || (!perms.accounts.shareAll && (!perms.accounts.specificIds || perms.accounts.specificIds.length === 0))) {
                continue;
            }

            const userAccounts = await firebase.getDocuments('accounts', sharing.ownerUserId);
            for (const acc of userAccounts as Array<Record<string, unknown>>) {
                const shared: Record<string, unknown> = {
                    id: acc.id,
                    name: acc.name,
                    currency: acc.currency,
                    isCash: acc.isCash,
                    color: acc.color,
                    type: acc.type,
                    icon: acc.icon,
                    ownerName: sharing.ownerDisplayName,
                    ownerUserId: sharing.ownerUserId,
                };
                if (perms.accounts.showBalance) shared.balance = acc.balance;
                accounts.push(shared);
            }
        }

        return c.json({ success: true, data: accounts });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch shared accounts' }, 500);
    }
});

// GET /family-data/:familyId/credit-cards — Shared credit cards detail
app.get('/:familyId/credit-cards', async (c) => {
    try {
        const familyId = c.req.param('familyId');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        if (!(await verifyMembership(firebase, familyId, userId))) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        const sharingConfigs = await getSharingForUser(firebase, familyId, userId);
        const cards = [];

        for (const config of sharingConfigs) {
            const sharing = config as {
                ownerUserId: string;
                ownerDisplayName: string;
                permissions: SharingPermissions;
            };

            const perms = sharing.permissions;
            if (!perms.creditCards || (!perms.creditCards.shareAll && (!perms.creditCards.specificIds || perms.creditCards.specificIds.length === 0))) {
                continue;
            }

            const userCards = await firebase.getDocuments('creditCards', sharing.ownerUserId);
            for (const card of userCards as Array<Record<string, unknown>>) {
                const shared: Record<string, unknown> = {
                    id: card.id,
                    name: card.name,
                    color: card.color,
                    ownerName: sharing.ownerDisplayName,
                    ownerUserId: sharing.ownerUserId,
                };
                if (perms.creditCards.showLimit) shared.creditLimit = card.creditLimit;
                if (perms.creditCards.showAvailable) {
                    shared.available = (card.creditLimit as number || 0) - (card.currentBillTotal as number || 0);
                }
                if (perms.creditCards.showBillTotal) shared.billTotal = card.currentBillTotal;
                cards.push(shared);
            }
        }

        return c.json({ success: true, data: cards });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch shared credit cards' }, 500);
    }
});

// POST /family-data/:familyId/repair — Create missing bidirectional sharing configs
app.post('/:familyId/repair', async (c) => {
    try {
        const familyId = c.req.param('familyId');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        if (!(await verifyMembership(firebase, familyId, userId))) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        // Get all active members
        const members = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'status', op: '==', value: 'active' },
        ]) as Array<{ userId: string; displayName: string }>;

        // Get existing sharing configs
        const existingSharing = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
        ]) as Array<{ ownerUserId: string; targetUserId: string }>;

        const now = new Date().toISOString();
        let created = 0;

        // For each pair of members, ensure bidirectional sharing exists
        for (const memberA of members) {
            for (const memberB of members) {
                if (memberA.userId === memberB.userId) continue;

                // Check if A→B sharing exists
                const existing = existingSharing.find(
                    s => s.ownerUserId === memberA.userId && s.targetUserId === memberB.userId
                ) as any;

                if (!existing) {
                    await firebase.createDocument('familySharing', {
                        familyId,
                        ownerUserId: memberA.userId,
                        ownerDisplayName: memberA.displayName || 'Member',
                        targetUserId: memberB.userId,
                        permissions: DEFAULT_SHARING_PERMISSIONS,
                        createdAt: now,
                        updatedAt: now,
                    });
                    created++;
                } else if (!existing.permissions?.accounts?.showTransactions || !existing.permissions?.creditCards?.showTransactions) {
                    // Upgrade existing config to share transactions (since it's a repair/sync action)
                    const updatedPerms = {
                        ...existing.permissions,
                        accounts: {
                            ...existing.permissions.accounts,
                            showTransactions: true
                        },
                        creditCards: {
                            ...existing.permissions.creditCards,
                            showTransactions: true
                        }
                    };
                    await firebase.updateDocument('familySharing', existing.id, {
                        permissions: updatedPerms,
                        updatedAt: now
                    });
                    created++; // Count it as a "repair" action
                }
            }
        }

        return c.json({ success: true, data: { created, totalMembers: members.length } });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to repair sharing configs' }, 500);
    }
});

// GET /family-data/:familyId/transactions — Shared transactions
app.get('/:familyId/transactions', async (c) => {
    try {
        const familyId = c.req.param('familyId');
        const userId = c.get('userId');
        const startDate = c.req.query('startDate');
        const endDate = c.req.query('endDate');
        const limitParam = c.req.query('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 500; // Default to 500 to cover full month usually

        const firebase = new FirebaseService(c.env);

        if (!(await verifyMembership(firebase, familyId, userId))) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        const sharingConfigs = await getSharingForUser(firebase, familyId, userId);
        let allTransactions: any[] = [];

        for (const config of sharingConfigs) {
            const sharing = config as {
                ownerUserId: string;
                ownerDisplayName: string;
                permissions: SharingPermissions;
            };

            const perms = sharing.permissions;
            const allowedAccountIds = new Set<string>();
            const allowedCreditCardIds = new Set<string>();

            // Determine allowed accounts
            if (perms.accounts?.showTransactions) {
                if (perms.accounts.shareAll) {
                    const accounts = await firebase.getDocuments('accounts', sharing.ownerUserId);
                    (accounts as any[]).forEach(a => allowedAccountIds.add(a.id));
                } else if (perms.accounts.specificIds) {
                    perms.accounts.specificIds.forEach(id => allowedAccountIds.add(id));
                }
            }

            // Determine allowed credit cards
            if (perms.creditCards?.showTransactions) {
                if (perms.creditCards.shareAll) {
                    const cards = await firebase.getDocuments('creditCards', sharing.ownerUserId);
                    (cards as any[]).forEach(c => allowedCreditCardIds.add(c.id));
                } else if (perms.creditCards.specificIds) {
                    perms.creditCards.specificIds.forEach(id => allowedCreditCardIds.add(id));
                }
            }

            if (allowedAccountIds.size === 0 && allowedCreditCardIds.size === 0) {
                continue;
            }

            // Fetch transactions for this member
            // Use only userId filter to avoid composite index requirements
            const filters = [
                { field: 'userId', op: '==', value: sharing.ownerUserId }
            ];

            const transactions = await firebase.queryDocuments('transactions', filters);

            // Filter by date and allowed accounts/cards in memory
            const filtered = transactions.filter((t: any) => {
                // Date filtering
                if (startDate && t.date < startDate) return false;
                if (endDate && t.date > endDate) return false;

                // If it has accountId, check if allowed
                if (t.accountId && allowedAccountIds.has(t.accountId)) return true;
                // If it has creditCardId, check if allowed
                if (t.creditCardId && allowedCreditCardIds.has(t.creditCardId)) return true;

                // Edge case: Transfers might have toAccountId.
                // If we share the destination account, we should probably see the incoming transfer?
                // But the transaction itself belongs to the sender.
                // For now, simple strict filtering.

                return false;
            }).map((t: any) => ({
                ...t,
                ownerName: sharing.ownerDisplayName,
                ownerUserId: sharing.ownerUserId,
                isShared: true
            }));

            allTransactions = [...allTransactions, ...filtered];
        }

        // Sort by date desc
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Apply limit
        if (allTransactions.length > limit) {
            allTransactions = allTransactions.slice(0, limit);
        }

        return c.json({ success: true, data: allTransactions });
    } catch (error) {
        console.error('Error fetching family transactions:', error);
        return c.json({ success: false, error: 'Failed to fetch family transactions' }, 500);
    }
});

export default app;
