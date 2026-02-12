import { auth } from '../firebase/config';
import type {
    Family,
    FamilyMember,
    FamilyInvitation,
    FamilySharing,
    SharingPermissions,
} from '../types/family';
import type { Transaction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const token = await user.getIdToken(true);
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================================
// FAMILY CRUD
// ============================================================

export async function getFamilies(): Promise<ApiResponse<Array<Family & { members: FamilyMember[]; myRole: string }>>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families`, { headers });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to fetch families' };
    }
}

export async function getFamily(familyId: string): Promise<ApiResponse<Family & { members: FamilyMember[]; sharingConfigs: FamilySharing[]; myRole: string }>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}`, { headers });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to fetch family' };
    }
}

export async function createFamily(name: string): Promise<ApiResponse<Family>> {
    try {
        const headers = await getAuthHeaders();
        const user = auth.currentUser;
        const response = await fetch(`${API_BASE_URL}/api/families`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name,
                displayName: user?.displayName || user?.email || 'Owner',
                photoURL: user?.photoURL || '',
            }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to create family' };
    }
}

export async function updateFamily(familyId: string, name: string): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ name }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to update family' };
    }
}

export async function deleteFamily(familyId: string): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}`, {
            method: 'DELETE',
            headers,
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to delete family' };
    }
}

// ============================================================
// INVITATIONS
// ============================================================

export async function sendInvitation(
    familyId: string,
    email: string,
    permissions?: SharingPermissions
): Promise<ApiResponse<FamilyInvitation>> {
    try {
        const headers = await getAuthHeaders();
        const user = auth.currentUser;
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}/invite`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                email,
                permissions,
                invitedByName: user?.displayName || user?.email || 'A family member',
            }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to send invitation' };
    }
}

export async function getPendingInvitations(): Promise<ApiResponse<FamilyInvitation[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/invitations/pending`, { headers });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to fetch invitations' };
    }
}

export async function acceptInvitation(invitationId: string): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const user = auth.currentUser;
        const response = await fetch(`${API_BASE_URL}/api/families/invitations/${invitationId}/accept`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                displayName: user?.displayName || user?.email || 'Member',
                photoURL: user?.photoURL || '',
            }),
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to accept invitation' };
    }
}

export async function declineInvitation(invitationId: string): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/invitations/${invitationId}/decline`, {
            method: 'POST',
            headers,
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to decline invitation' };
    }
}

// ============================================================
// MEMBERS
// ============================================================

export async function removeMember(familyId: string, memberId: string): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}/members/${memberId}`, {
            method: 'DELETE',
            headers,
        });
        return await response.json();
    } catch (error) {
        return { success: false, error: 'Failed to remove member' };
    }
}

// ============================================================
// SHARING
// ============================================================

export async function getSharingConfigs(familyId: string): Promise<ApiResponse<{
    mySharing: FamilySharing[];
    sharedWithMe: FamilySharing[];
}>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}/sharing`, { headers });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to fetch sharing configs' };
    }
}

export async function updateSharingPermissions(
    familyId: string,
    targetUserId: string,
    permissions: SharingPermissions
): Promise<ApiResponse<void>> {
    try {
        const headers = await getAuthHeaders();
        const user = auth.currentUser;
        const response = await fetch(`${API_BASE_URL}/api/families/${familyId}/sharing/${targetUserId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                permissions,
                ownerDisplayName: user?.displayName || user?.email || 'Member',
            }),
        });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to update sharing' };
    }
}

// ============================================================
// FAMILY DATA (Read-only shared data)
// ============================================================

export async function getFamilySummary(familyId: string): Promise<ApiResponse<unknown[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/family-data/${familyId}/summary`, { headers });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to fetch family summary' };
    }
}

export async function getSharedAccounts(familyId: string): Promise<ApiResponse<unknown[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/family-data/${familyId}/accounts`, { headers });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to fetch shared accounts' };
    }
}

export async function getSharedCreditCards(familyId: string): Promise<ApiResponse<unknown[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/family-data/${familyId}/credit-cards`, { headers });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to fetch shared credit cards' };
    }
}

export async function repairSharing(familyId: string): Promise<ApiResponse<{ created: number; totalMembers: number }>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/family-data/${familyId}/repair`, {
            method: 'POST',
            headers,
        });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to repair sharing configs' };
    }
}

export async function getFamilyTransactions(
    familyId: string,
    filters?: { startDate?: string; endDate?: string; limit?: number }
): Promise<ApiResponse<Transaction[]>> {
    try {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        if (filters?.startDate) queryParams.append('startDate', filters.startDate);
        if (filters?.endDate) queryParams.append('endDate', filters.endDate);
        if (filters?.limit) queryParams.append('limit', filters.limit.toString());

        const response = await fetch(`${API_BASE_URL}/api/family-data/${familyId}/transactions?${queryParams.toString()}`, { headers });
        return await response.json();
    } catch (_) {
        return { success: false, error: 'Failed to fetch family transactions' };
    }
}



