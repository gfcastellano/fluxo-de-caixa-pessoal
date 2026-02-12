// ===== Family Feature Types =====

export interface Family {
    id: string;
    name: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface FamilyMember {
    id: string;
    familyId: string;
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'pending' | 'removed';
    joinedAt: string;
    updatedAt: string;
}

export interface FamilyInvitation {
    id: string;
    familyId: string;
    familyName: string;
    invitedBy: string;
    invitedByName: string;
    invitedEmail: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    permissions: SharingPermissions;
    createdAt: string;
    expiresAt: string;
}

export interface FamilySharing {
    id: string;
    familyId: string;
    ownerUserId: string;
    ownerDisplayName: string;
    targetUserId: string;
    permissions: SharingPermissions;
    createdAt: string;
    updatedAt: string;
}

export interface SharingPermissions {
    accounts: {
        shareAll: boolean;
        specificIds?: string[];
        showBalance: boolean;
        showTransactions: boolean;
    };
    creditCards: {
        shareAll: boolean;
        specificIds?: string[];
        showLimit: boolean;
        showAvailable: boolean;
        showBillTotal: boolean;
        showTransactions: boolean;
    };
    categories: {
        shareAll: boolean;
        specificIds?: string[];
    };
    budgets: {
        shareAll: boolean;
        specificIds?: string[];
        showSpent: boolean;
        showRemaining: boolean;
    };
    reports: {
        shareOverview: boolean;
        shareCategoryBreakdown: boolean;
        shareTrends: boolean;
    };
}

export const DEFAULT_SHARING_PERMISSIONS: SharingPermissions = {
    accounts: {
        shareAll: true,
        showBalance: true,
        showTransactions: true,
    },
    creditCards: {
        shareAll: true,
        showLimit: true,
        showAvailable: true,
        showBillTotal: true,
        showTransactions: true,
    },
    categories: {
        shareAll: false,
    },
    budgets: {
        shareAll: false,
        showSpent: false,
        showRemaining: false,
    },
    reports: {
        shareOverview: true,
        shareCategoryBreakdown: false,
        shareTrends: false,
    },
};

// === Shared Data Types (read-only, returned by backend) ===

export interface SharedAccount {
    id: string;
    name: string;
    currency: string;
    balance?: number;
    isCash?: boolean;
    color?: string;
    type?: string;
    icon?: string;
    ownerName: string;
    ownerUserId: string;
}

export interface SharedCreditCard {
    id: string;
    name: string;
    creditLimit?: number;
    available?: number;
    billTotal?: number;
    color?: string;
    ownerName: string;
    ownerUserId: string;
}

export interface SharedBudget {
    id: string;
    categoryName: string;
    amount: number;
    spent?: number;
    remaining?: number;
    percentage?: number;
    ownerName: string;
    ownerUserId: string;
}

export interface FamilySummary {
    familyId: string;
    familyName: string;
    members: FamilyMember[];
    sharedData: {
        ownerUserId: string;
        ownerDisplayName: string;
        accounts?: SharedAccount[];
        creditCards?: SharedCreditCard[];
        budgets?: SharedBudget[];
        overview?: {
            totalIncome?: number;
            totalExpenses?: number;
        };
    }[];
}
