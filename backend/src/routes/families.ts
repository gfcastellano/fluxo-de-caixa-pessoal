import { Hono } from 'hono';
import type { Env, Variables } from '../types/context';
import { FirebaseService } from '../services/firebase';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import { DEFAULT_SHARING_PERMISSIONS } from '../types/family';
import { EmailService } from '../services/email';


const familySchema = z.object({
    name: z.string().min(1).max(50),
});

const inviteSchema = z.object({
    email: z.string().email(),
    permissions: z.object({
        accounts: z.object({
            shareAll: z.boolean(),
            specificIds: z.array(z.string()).optional(),
            showBalance: z.boolean(),
            showTransactions: z.boolean(),
        }),
        creditCards: z.object({
            shareAll: z.boolean(),
            specificIds: z.array(z.string()).optional(),
            showLimit: z.boolean(),
            showAvailable: z.boolean(),
            showBillTotal: z.boolean(),
            showTransactions: z.boolean(),
        }),
        categories: z.object({
            shareAll: z.boolean(),
            specificIds: z.array(z.string()).optional(),
        }),
        budgets: z.object({
            shareAll: z.boolean(),
            specificIds: z.array(z.string()).optional(),
            showSpent: z.boolean(),
            showRemaining: z.boolean(),
        }),
        reports: z.object({
            shareOverview: z.boolean(),
            shareCategoryBreakdown: z.boolean(),
            shareTrends: z.boolean(),
        }),
    }).optional(),
});

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', authMiddleware);

// ============================================================
// FAMILY CRUD
// ============================================================

// POST /families — Create a family
app.post('/', async (c) => {
    try {
        const userId = c.get('userId');
        const userEmail = c.get('userEmail');
        const body = await c.req.json();
        const validated = familySchema.parse(body);
        const firebase = new FirebaseService(c.env);
        const now = new Date().toISOString();

        // Check if user is already a member or owner of any family
        const existingMemberships = await firebase.queryDocuments('familyMembers', [
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (existingMemberships.length > 0) {
            return c.json({ success: false, error: 'Você já participa de uma família' }, 400);
        }


        // Create family
        const family = await firebase.createDocument('families', {
            name: validated.name,
            createdBy: userId,
            createdAt: now,
            updatedAt: now,
        });

        const familyId = (family as { id: string }).id;

        // Add creator as owner member
        await firebase.createDocument('familyMembers', {
            familyId,
            userId,
            email: userEmail || '',
            displayName: body.displayName || userEmail || 'Owner',
            photoURL: body.photoURL || '',
            role: 'owner',
            status: 'active',
            joinedAt: now,
            updatedAt: now,
        });

        return c.json({ success: true, data: family }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ success: false, error: error.errors[0].message }, 400);
        }
        return c.json({ success: false, error: 'Failed to create family' }, 500);
    }
});

// GET /families — List families the user belongs to
app.get('/', async (c) => {
    try {
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        // Find all familyMembers where userId matches
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);

        if (memberships.length === 0) {
            return c.json({ success: true, data: [] });
        }

        // Fetch each family's details
        const families = [];
        for (const membership of memberships) {
            const familyId = (membership as { familyId: string }).familyId;
            const family = await firebase.getDocument('families', familyId);
            if (family) {
                // Get all members for this family
                const members = await firebase.queryDocuments('familyMembers', [
                    { field: 'familyId', op: '==', value: familyId },
                    { field: 'status', op: '==', value: 'active' },
                ]);
                families.push({
                    ...family,
                    members,
                    myRole: (membership as { role: string }).role,
                });
            }
        }

        return c.json({ success: true, data: families });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch families' }, 500);
    }
});

// GET /families/:id — Get family details
app.get('/:id', async (c) => {
    try {
        const familyId = c.req.param('id');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        // Verify user is a member
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (memberships.length === 0) {
            return c.json({ success: false, error: 'Not a member of this family' }, 403);
        }

        const family = await firebase.getDocument('families', familyId);
        if (!family) {
            return c.json({ success: false, error: 'Family not found' }, 404);
        }

        // Get all members
        const members = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'status', op: '==', value: 'active' },
        ]);

        // Get sharing configs for what I can see
        const sharingConfigs = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'targetUserId', op: '==', value: userId },
        ]);

        return c.json({
            success: true,
            data: {
                ...family,
                members,
                sharingConfigs,
                myRole: (memberships[0] as { role: string }).role,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch family' }, 500);
    }
});

// PUT /families/:id — Update family name
app.put('/:id', async (c) => {
    try {
        const familyId = c.req.param('id');
        const userId = c.get('userId');
        const body = await c.req.json();
        const validated = familySchema.parse(body);
        const firebase = new FirebaseService(c.env);

        // Check user is owner or admin
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
        ]);
        const membership = memberships[0] as { role: string } | undefined;
        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return c.json({ success: false, error: 'Unauthorized' }, 403);
        }

        await firebase.updateDocument('families', familyId, {
            name: validated.name,
            updatedAt: new Date().toISOString(),
        });

        return c.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ success: false, error: error.errors[0].message }, 400);
        }
        return c.json({ success: false, error: 'Failed to update family' }, 500);
    }
});

// DELETE /families/:id — Delete family (owner only)
app.delete('/:id', async (c) => {
    try {
        const familyId = c.req.param('id');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        // Check user is owner
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
            { field: 'role', op: '==', value: 'owner' },
        ]);
        if (memberships.length === 0) {
            return c.json({ success: false, error: 'Only the owner can delete a family' }, 403);
        }

        // Delete all family members
        const allMembers = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
        ]);
        for (const member of allMembers) {
            await firebase.deleteDocument('familyMembers', (member as { id: string }).id);
        }

        // Delete all sharing configs
        const allSharing = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
        ]);
        for (const sharing of allSharing) {
            await firebase.deleteDocument('familySharing', (sharing as { id: string }).id);
        }

        // Delete all pending invitations
        const allInvitations = await firebase.queryDocuments('familyInvitations', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'status', op: '==', value: 'pending' },
        ]);
        for (const invitation of allInvitations) {
            await firebase.deleteDocument('familyInvitations', (invitation as { id: string }).id);
        }

        // Delete family
        await firebase.deleteDocument('families', familyId);

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to delete family' }, 500);
    }
});

// ============================================================
// INVITATIONS
// ============================================================

// POST /families/:id/invite — Send invitation
app.post('/:id/invite', async (c) => {
    try {
        const familyId = c.req.param('id');
        const userId = c.get('userId');
        const body = await c.req.json();
        const validated = inviteSchema.parse(body);
        const firebase = new FirebaseService(c.env);

        // Check user is owner or admin
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
        ]);
        const membership = memberships[0] as { role: string; displayName?: string } | undefined;
        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
            return c.json({ success: false, error: 'Unauthorized' }, 403);
        }

        // Get family details for invitation
        const family = await firebase.getDocument('families', familyId);
        if (!family) {
            return c.json({ success: false, error: 'Family not found' }, 404);
        }

        // Check if already invited (pending)
        const existingInvites = await firebase.queryDocuments('familyInvitations', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'invitedEmail', op: '==', value: validated.email },
            { field: 'status', op: '==', value: 'pending' },
        ]);
        if (existingInvites.length > 0) {
            return c.json({ success: false, error: 'Invitation already sent to this email' }, 400);
        }

        // Check if already a member
        const existingMembers = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'email', op: '==', value: validated.email },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (existingMembers.length > 0) {
            return c.json({ success: false, error: 'User is already a member' }, 400);
        }

        // Check member limit (max 4 members)
        const currentMembers = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (currentMembers.length >= 4) {
            return c.json({ success: false, error: 'Limite de 4 membros por família atingido' }, 400);
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = await firebase.createDocument('familyInvitations', {
            familyId,
            familyName: (family as { name: string }).name,
            invitedBy: userId,
            invitedByName: body.invitedByName || membership.displayName || 'Um membro da família',
            invitedEmail: validated.email,
            status: 'pending',
            permissions: validated.permissions || DEFAULT_SHARING_PERMISSIONS,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
        });

        // Send email notification (async - don't block response)
        const emailService = new EmailService(c.env);
        const invitedByName = body.invitedByName || membership.displayName || 'Um membro da família';
        emailService.sendInvitationEmail(validated.email, invitedByName, (family as { name: string }).name)
            .catch(err => console.error('Failed to send invitation email:', err));

        return c.json({ success: true, data: invitation }, 201);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return c.json({ success: false, error: error.errors[0].message }, 400);
        }
        return c.json({ success: false, error: 'Failed to send invitation' }, 500);
    }
});


// GET /families/invitations/pending — List pending invitations for current user
app.get('/invitations/pending', async (c) => {
    try {
        const userEmail = c.get('userEmail');
        const firebase = new FirebaseService(c.env);

        if (!userEmail) {
            return c.json({ success: true, data: [] });
        }

        const invitations = await firebase.queryDocuments('familyInvitations', [
            { field: 'invitedEmail', op: '==', value: userEmail },
            { field: 'status', op: '==', value: 'pending' },
        ]);

        // Filter out expired ones
        const now = new Date();
        const validInvitations = invitations.filter((inv) => {
            const expiresAt = new Date((inv as { expiresAt: string }).expiresAt);
            return expiresAt > now;
        });

        return c.json({ success: true, data: validInvitations });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch invitations' }, 500);
    }
});

// POST /families/invitations/:id/accept — Accept invitation
app.post('/invitations/:id/accept', async (c) => {
    try {
        const invitationId = c.req.param('id');
        const userId = c.get('userId');
        const userEmail = c.get('userEmail');
        const firebase = new FirebaseService(c.env);

        const invitation = await firebase.getDocument('familyInvitations', invitationId);
        if (!invitation) {
            return c.json({ success: false, error: 'Invitation not found' }, 404);
        }

        const inv = invitation as {
            invitedEmail: string;
            status: string;
            familyId: string;
            invitedBy: string;
            invitedByName: string;
            permissions: Record<string, unknown>;
            expiresAt: string;
        };

        // Verify invitation is for this user
        if (inv.invitedEmail !== userEmail) {
            return c.json({ success: false, error: 'This invitation is not for you' }, 403);
        }

        if (inv.status !== 'pending') {
            return c.json({ success: false, error: 'Invitation is no longer pending' }, 400);
        }

        // Check expiration
        // Check if user is already a member of ANY family
        const existingMemberships = await firebase.queryDocuments('familyMembers', [
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (existingMemberships.length > 0) {
            return c.json({ success: false, error: 'Você já participa de uma família e não pode aceitar outro convite' }, 400);
        }

        const now = new Date().toISOString();

        const body = await c.req.json().catch(() => ({})) as { displayName?: string; photoURL?: string };
        const acceptorDisplayName = body.displayName || userEmail || 'Member';

        // Add as family member
        await firebase.createDocument('familyMembers', {
            familyId: inv.familyId,
            userId,
            email: userEmail || '',
            displayName: acceptorDisplayName,
            photoURL: body.photoURL || '',
            role: 'member',
            status: 'active',
            joinedAt: now,
            updatedAt: now,
        });

        // Resolve inviter's display name from familyMembers
        const inviterMembers = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: inv.familyId },
            { field: 'userId', op: '==', value: inv.invitedBy },
            { field: 'status', op: '==', value: 'active' },
        ]);
        const inviterDisplayName = inviterMembers.length > 0
            ? (inviterMembers[0] as { displayName: string }).displayName
            : inv.invitedByName || 'Family Member';

        // Create sharing: inviter → acceptor (acceptor can see inviter's data)
        await firebase.createDocument('familySharing', {
            familyId: inv.familyId,
            ownerUserId: inv.invitedBy,
            ownerDisplayName: inviterDisplayName,
            targetUserId: userId,
            permissions: inv.permissions || DEFAULT_SHARING_PERMISSIONS,
            createdAt: now,
            updatedAt: now,
        });

        // Create sharing: acceptor → inviter (inviter can see acceptor's data)
        await firebase.createDocument('familySharing', {
            familyId: inv.familyId,
            ownerUserId: userId,
            ownerDisplayName: acceptorDisplayName,
            targetUserId: inv.invitedBy,
            permissions: inv.permissions || DEFAULT_SHARING_PERMISSIONS,
            createdAt: now,
            updatedAt: now,
        });

        // Update invitation status
        await firebase.updateDocument('familyInvitations', invitationId, {
            status: 'accepted',
        });

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to accept invitation' }, 500);
    }
});

// POST /families/invitations/:id/decline — Decline invitation
app.post('/invitations/:id/decline', async (c) => {
    try {
        const invitationId = c.req.param('id');
        const userEmail = c.get('userEmail');
        const firebase = new FirebaseService(c.env);

        const invitation = await firebase.getDocument('familyInvitations', invitationId);
        if (!invitation) {
            return c.json({ success: false, error: 'Invitation not found' }, 404);
        }

        if ((invitation as { invitedEmail: string }).invitedEmail !== userEmail) {
            return c.json({ success: false, error: 'This invitation is not for you' }, 403);
        }

        await firebase.updateDocument('familyInvitations', invitationId, {
            status: 'declined',
        });

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to decline invitation' }, 500);
    }
});

// ============================================================
// MEMBERS
// ============================================================

// DELETE /families/:id/members/:memberId — Remove member
app.delete('/:id/members/:memberId', async (c) => {
    try {
        const familyId = c.req.param('id');
        const memberId = c.req.param('memberId');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        // Check user is owner or admin
        const myMemberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
        ]);
        const myMembership = myMemberships[0] as { role: string } | undefined;
        if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
            return c.json({ success: false, error: 'Unauthorized' }, 403);
        }

        // Get the member to remove
        const memberDoc = await firebase.getDocument('familyMembers', memberId);
        if (!memberDoc) {
            return c.json({ success: false, error: 'Member not found' }, 404);
        }

        const member = memberDoc as { role: string; userId: string; familyId: string };
        if (member.familyId !== familyId) {
            return c.json({ success: false, error: 'Member does not belong to this family' }, 400);
        }

        const isSelfRemoval = member.userId === userId;

        // Check permissions: owner/admin can remove others, anyone can remove themselves (except owner)
        if (!isSelfRemoval && myMembership.role !== 'owner' && myMembership.role !== 'admin') {
            return c.json({ success: false, error: 'Unauthorized. Only owners and admins can remove other members.' }, 403);
        }

        // Can't remove owner (they must delete the family instead)
        if (member.role === 'owner') {
            return c.json({ success: false, error: 'The family owner cannot be removed. You must delete the family instead.' }, 400);
        }

        // Remove member
        await firebase.deleteDocument('familyMembers', memberId);

        // Also delete sharing configs involving this user
        const sharingFrom = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'ownerUserId', op: '==', value: member.userId },
        ]);
        for (const s of sharingFrom) {
            await firebase.deleteDocument('familySharing', (s as { id: string }).id);
        }

        const sharingTo = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'targetUserId', op: '==', value: member.userId },
        ]);
        for (const s of sharingTo) {
            await firebase.deleteDocument('familySharing', (s as { id: string }).id);
        }

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to remove member' }, 500);
    }
});

// ============================================================
// SHARING PERMISSIONS
// ============================================================

// GET /families/:id/sharing — Get sharing configurations
app.get('/:id/sharing', async (c) => {
    try {
        const familyId = c.req.param('id');
        const userId = c.get('userId');
        const firebase = new FirebaseService(c.env);

        // Verify membership
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (memberships.length === 0) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        // Get all sharing configs for this family where I am owner (what I share)
        const mySharing = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'ownerUserId', op: '==', value: userId },
        ]);

        // Get all sharing configs where I am target (what's shared with me)
        const sharedWithMe = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'targetUserId', op: '==', value: userId },
        ]);

        return c.json({
            success: true,
            data: { mySharing, sharedWithMe },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to fetch sharing configs' }, 500);
    }
});

// PUT /families/:id/sharing/:targetUserId — Update sharing permissions
app.put('/:id/sharing/:targetUserId', async (c) => {
    try {
        const familyId = c.req.param('id');
        const targetUserId = c.req.param('targetUserId');
        const userId = c.get('userId');
        const body = await c.req.json();
        const firebase = new FirebaseService(c.env);

        // Verify membership
        const memberships = await firebase.queryDocuments('familyMembers', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'userId', op: '==', value: userId },
            { field: 'status', op: '==', value: 'active' },
        ]);
        if (memberships.length === 0) {
            return c.json({ success: false, error: 'Not a member' }, 403);
        }

        // Find existing sharing config
        const existingSharing = await firebase.queryDocuments('familySharing', [
            { field: 'familyId', op: '==', value: familyId },
            { field: 'ownerUserId', op: '==', value: userId },
            { field: 'targetUserId', op: '==', value: targetUserId },
        ]);

        const now = new Date().toISOString();

        if (existingSharing.length > 0) {
            // Update existing
            const sharingId = (existingSharing[0] as { id: string }).id;
            await firebase.updateDocument('familySharing', sharingId, {
                permissions: body.permissions,
                updatedAt: now,
            });
        } else {
            // Create new sharing config
            await firebase.createDocument('familySharing', {
                familyId,
                ownerUserId: userId,
                ownerDisplayName: body.ownerDisplayName || 'Member',
                targetUserId,
                permissions: body.permissions || DEFAULT_SHARING_PERMISSIONS,
                createdAt: now,
                updatedAt: now,
            });
        }

        return c.json({ success: true });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to update sharing' }, 500);
    }
});

export default app;
