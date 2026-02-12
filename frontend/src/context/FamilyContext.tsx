import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Family, FamilyMember, FamilyInvitation, SharingPermissions, SharedAccount, SharedCreditCard, SharedBudget } from '../types/family';
import * as familyService from '../services/familyService';

interface FamilyWithMeta extends Family {
    members: FamilyMember[];
    myRole: string;
}

type ViewMode = 'personal' | 'family';

// Shared data from family members (read-only)
interface SharedMemberData {
    ownerUserId: string;
    ownerDisplayName: string;
    accounts?: SharedAccount[];
    creditCards?: SharedCreditCard[];
    budgets?: SharedBudget[];
    overview?: {
        totalIncome?: number;
        totalExpenses?: number;
    };
}

interface FamilyContextType {
    families: FamilyWithMeta[];
    activeFamily: FamilyWithMeta | null;
    pendingInvitations: FamilyInvitation[];
    loading: boolean;
    error: string | null;
    // View mode
    viewMode: ViewMode;
    toggleViewMode: () => void;
    // Shared data
    sharedData: SharedMemberData[];
    sharedDataLoading: boolean;
    // Actions
    refresh: () => Promise<void>;
    refreshInvitations: () => Promise<void>;
    createFamily: (name: string) => Promise<boolean>;
    deleteFamily: (familyId: string) => Promise<boolean>;
    sendInvite: (familyId: string, email: string, permissions?: unknown) => Promise<boolean>;
    acceptInvite: (invitationId: string) => Promise<boolean>;
    declineInvite: (invitationId: string) => Promise<boolean>;
    removeMember: (familyId: string, memberId: string) => Promise<boolean>;
    updateMemberSharing: (familyId: string, targetUserId: string, permissions: SharingPermissions) => Promise<boolean>;
    // Helpers
    getMemberPhoto: (userId: string) => string | undefined;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [families, setFamilies] = useState<FamilyWithMeta[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<FamilyInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('personal');
    const [sharedData, setSharedData] = useState<SharedMemberData[]>([]);

    const [sharedDataLoading, setSharedDataLoading] = useState(false);

    const activeFamily = families.length > 0 ? families[0] : null;

    const refresh = useCallback(async () => {
        if (!user) {
            setFamilies([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await familyService.getFamilies();
            if (result.success && result.data) {
                setFamilies(result.data as FamilyWithMeta[]);
            } else {
                setError(result.error || 'Failed to load families');
            }
        } catch {
            setError('Failed to load families');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const refreshInvitations = useCallback(async () => {
        if (!user) {
            setPendingInvitations([]);
            return;
        }
        try {
            const result = await familyService.getPendingInvitations();
            if (result.success && result.data) {
                setPendingInvitations(result.data);
            }
        } catch {
            // Silently fail — invitations are non-critical
        }
    }, [user]);

    const loadSharedData = useCallback(async () => {
        if (!activeFamily) {
            console.log('[FamilyContext] loadSharedData: no activeFamily, skipping');
            return;
        }
        console.log('[FamilyContext] loadSharedData: fetching for family', activeFamily.id);
        setSharedDataLoading(true);
        try {
            let result = await familyService.getFamilySummary(activeFamily.id);
            console.log('[FamilyContext] loadSharedData result:', JSON.stringify(result));

            // Auto-repair: if data is empty but family has 2+ members, create missing sharing configs
            if (result.success && result.data && result.data.length === 0 && activeFamily.members && activeFamily.members.length >= 2) {
                console.log('[FamilyContext] No sharing data found, running auto-repair...');
                const repairResult = await familyService.repairSharing(activeFamily.id);
                console.log('[FamilyContext] Repair result:', JSON.stringify(repairResult));
                if (repairResult.success && repairResult.data && repairResult.data.created > 0) {
                    // Re-fetch after repair
                    result = await familyService.getFamilySummary(activeFamily.id);
                    console.log('[FamilyContext] Re-fetched after repair:', JSON.stringify(result));
                }
            }

            if (result.success && result.data) {
                setSharedData(result.data as SharedMemberData[]);
            } else {
                console.warn('[FamilyContext] loadSharedData failed:', result.error);
            }
        } catch (err) {
            console.error('[FamilyContext] loadSharedData error:', err);
        } finally {
            setSharedDataLoading(false);
        }
    }, [activeFamily]);

    const toggleViewMode = useCallback(() => {
        setViewMode(prev => {
            const next = prev === 'personal' ? 'family' : 'personal';
            console.log('[FamilyContext] toggleViewMode:', prev, '->', next, '| activeFamily:', activeFamily?.id);
            return next;
        });
    }, [activeFamily]);

    // When viewMode changes to 'family', fetch shared data
    useEffect(() => {
        console.log('[FamilyContext] viewMode changed to:', viewMode, '| activeFamily:', activeFamily?.id);
        if (viewMode === 'family' && activeFamily) {
            loadSharedData();
        }
    }, [viewMode, activeFamily, loadSharedData]);

    // Reset viewMode when user changes or no family
    useEffect(() => {
        if (!activeFamily) {
            setViewMode('personal');
            setSharedData([]);
        }
    }, [activeFamily]);

    // Auto-load on user change
    useEffect(() => {
        if (user) {
            refresh();
            refreshInvitations();
        } else {
            setFamilies([]);
            setPendingInvitations([]);
            setViewMode('personal');
            setSharedData([]);
        }
    }, [user, refresh, refreshInvitations]);

    const createFamilyFn = useCallback(async (name: string): Promise<boolean> => {
        const result = await familyService.createFamily(name);
        if (result.success) {
            await refresh();
            return true;
        }
        setError(result.error || 'Failed to create family');
        return false;
    }, [refresh]);

    const deleteFamilyFn = useCallback(async (familyId: string): Promise<boolean> => {
        const result = await familyService.deleteFamily(familyId);
        if (result.success) {
            await refresh();
            return true;
        }
        setError(result.error || 'Failed to delete family');
        return false;
    }, [refresh]);

    const sendInvite = useCallback(async (familyId: string, email: string, permissions?: unknown): Promise<boolean> => {
        const result = await familyService.sendInvitation(familyId, email, permissions as never);
        if (result.success) {
            return true;
        }
        setError(result.error || 'Failed to send invitation');
        return false;
    }, []);

    const acceptInvite = useCallback(async (invitationId: string): Promise<boolean> => {
        const result = await familyService.acceptInvitation(invitationId);
        if (result.success) {
            await refresh();
            await refreshInvitations();
            return true;
        }
        setError(result.error || 'Failed to accept invitation');
        return false;
    }, [refresh, refreshInvitations]);

    const declineInvite = useCallback(async (invitationId: string): Promise<boolean> => {
        const result = await familyService.declineInvitation(invitationId);
        if (result.success) {
            await refreshInvitations();
            return true;
        }
        setError(result.error || 'Failed to decline invitation');
        return false;
    }, [refreshInvitations]);

    const removeMemberFn = useCallback(async (familyId: string, memberId: string): Promise<boolean> => {
        const result = await familyService.removeMember(familyId, memberId);
        if (result.success) {
            await refresh();
            return true;
        }
        setError(result.error || 'Failed to remove member');
        return false;
    }, [refresh]);

    const updateMemberSharing = useCallback(async (familyId: string, targetUserId: string, permissions: SharingPermissions): Promise<boolean> => {
        const result = await familyService.updateSharingPermissions(familyId, targetUserId, permissions);
        if (result.success) {
            return true;
        }
        setError(result.error || 'Failed to update sharing permissions');
        return false;
    }, []);

    const getMemberPhoto = useCallback((userId: string) => {
        return activeFamily?.members.find(m => m.userId === userId)?.photoURL;
    }, [activeFamily]);

    return (
        <FamilyContext.Provider
            value={{
                families,
                activeFamily,
                pendingInvitations,
                loading,
                error,
                viewMode,
                toggleViewMode,
                sharedData,
                sharedDataLoading,
                refresh,
                refreshInvitations,
                createFamily: createFamilyFn,
                deleteFamily: deleteFamilyFn,
                sendInvite,
                acceptInvite,
                declineInvite,
                removeMember: removeMemberFn,
                updateMemberSharing,
                getMemberPhoto,
            }}
        >
            {children}
        </FamilyContext.Provider>
    );
}

export function useFamily() {
    const context = useContext(FamilyContext);
    if (context === undefined) {
        throw new Error('useFamily must be used within a FamilyProvider');
    }
    return context;
}
