// ===== Family Feature Types =====

export interface Family {
    id: string;
    name: string;
    createdBy: string;       // userId do criador
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
    invitedBy: string;        // userId de quem convidou
    invitedByName: string;    // Nome de quem convidou
    invitedEmail: string;     // Email da pessoa convidada
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    permissions: SharingPermissions;
    createdAt: string;
    expiresAt: string;
}

export interface FamilySharing {
    id: string;
    familyId: string;
    ownerUserId: string;      // Quem está compartilhando
    ownerDisplayName: string;
    targetUserId: string;     // Com quem está compartilhando
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

// Default permissions — include transactions by default
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
