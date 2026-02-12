import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './Card';
import { Button } from './Button';
import { useFamily } from '../context/FamilyContext';
import { useAuth } from '../context/AuthContext';
import { FamilyCreateModal } from './FamilyCreateModal';
import { FamilyInviteModal } from './FamilyInviteModal';
import { FamilySharingModal } from './FamilySharingModal';
import type { SharingPermissions } from '../types/family';
import { DEFAULT_SHARING_PERMISSIONS } from '../types/family';
import { getSharingConfigs } from '../services/familyService';
import { Users, UserPlus, Crown, Shield, User, Trash2, Check, X, Mail, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

export function FamilySection() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const {
        families,
        activeFamily,
        pendingInvitations,
        loading,
        error,
        createFamily,
        deleteFamily,
        sendInvite,
        acceptInvite,
        declineInvite,
        removeMember,
        updateMemberSharing,
    } = useFamily();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
    const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

    // Sharing permissions state
    const [sharingConfigs, setSharingConfigs] = useState<Record<string, SharingPermissions>>({});
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

    // Fetch sharing permissions when active family changes
    useEffect(() => {
        if (activeFamily && user) {
            getSharingConfigs(activeFamily.id).then(result => {
                if (result.success && result.data) {
                    const configMap: Record<string, SharingPermissions> = {};
                    // Map permissions I gave to others (mySharing)
                    result.data.mySharing.forEach((share: any) => {
                        configMap[share.targetUserId] = share.permissions;
                    });
                    setSharingConfigs(configMap);
                }
            });
        }
    }, [activeFamily, user]);

    const handleCreateFamily = async (name: string) => {
        await createFamily(name);
    };

    const handleSendInvite = async (email: string, permissions: SharingPermissions) => {
        if (activeFamily) {
            await sendInvite(activeFamily.id, email, permissions);
        }
    };

    const handleDeleteFamily = async () => {
        if (activeFamily) {
            await deleteFamily(activeFamily.id);
            setShowDeleteConfirm(false);
        }
    };

    const handleAcceptInvite = async (invitationId: string) => {
        setProcessingInviteId(invitationId);
        await acceptInvite(invitationId);
        setProcessingInviteId(null);
    };

    const handleDeclineInvite = async (invitationId: string) => {
        setProcessingInviteId(invitationId);
        await declineInvite(invitationId);
        setProcessingInviteId(null);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (activeFamily) {
            setRemovingMemberId(memberId);
            await removeMember(activeFamily.id, memberId);
            setRemovingMemberId(null);
        }
    };

    const handleSavePermissions = async (permissions: SharingPermissions) => {
        if (activeFamily && editingMemberId) {
            // Find the member to get their userId
            const member = activeFamily.members.find(m => m.id === editingMemberId);
            if (member) {
                const success = await updateMemberSharing(activeFamily.id, member.userId, permissions);
                if (success) {
                    // Update local state
                    setSharingConfigs(prev => ({
                        ...prev,
                        [member.userId]: permissions
                    }));
                }
            }
        }
    };

    const getEditingMemberName = () => {
        if (!activeFamily || !editingMemberId) return '';
        const member = activeFamily.members.find(m => m.id === editingMemberId);
        return member ? member.displayName : '';
    };

    const getEditingMemberPermissions = () => {
        if (!activeFamily || !editingMemberId) return DEFAULT_SHARING_PERMISSIONS;
        const member = activeFamily.members.find(m => m.id === editingMemberId);
        if (member && sharingConfigs[member.userId]) {
            return sharingConfigs[member.userId];
        }
        return DEFAULT_SHARING_PERMISSIONS;
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner': return <Crown className="h-3.5 w-3.5 text-amber-500" />;
            case 'admin': return <Shield className="h-3.5 w-3.5 text-blue" />;
            default: return <User className="h-3.5 w-3.5 text-slate" />;
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner': return t('settings.family.roleOwner', 'Owner');
            case 'admin': return t('settings.family.roleAdmin', 'Admin');
            default: return t('settings.family.roleMember', 'Member');
        }
    };

    const canManage = activeFamily?.myRole === 'owner' || activeFamily?.myRole === 'admin';

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-500/10 text-violet-500">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>{t('settings.family.title', 'Family')}</CardTitle>
                            <CardDescription>{t('settings.family.description', 'Share your finances with family members')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-xl bg-rose/10 border border-rose/20 text-sm text-rose">
                            {error}
                        </div>
                    )}

                    {/* Pending Invitations Banner */}
                    {pendingInvitations.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                {t('settings.family.pendingInvitations', 'Pending Invitations')}
                            </p>
                            {pendingInvitations.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ink truncate">
                                            {inv.familyName}
                                        </p>
                                        <p className="text-xs text-slate">
                                            {t('settings.family.invitedBy', 'Invited by {{name}}', { name: inv.invitedByName })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 ml-2">
                                        <button
                                            onClick={() => handleAcceptInvite(inv.id)}
                                            disabled={processingInviteId === inv.id}
                                            className="p-1.5 rounded-lg bg-emerald/10 text-emerald hover:bg-emerald/20 transition-colors disabled:opacity-50"
                                            title={t('settings.family.accept', 'Accept')}
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeclineInvite(inv.id)}
                                            disabled={processingInviteId === inv.id}
                                            className="p-1.5 rounded-lg bg-rose/10 text-rose hover:bg-rose/20 transition-colors disabled:opacity-50"
                                            title={t('settings.family.decline', 'Decline')}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {loading && families.length === 0 ? (
                        <div className="text-center py-6 text-sm text-slate">
                            {t('common.loading', 'Loading...')}
                        </div>
                    ) : families.length === 0 ? (
                        /* No Family State */
                        <div className="text-center py-6 space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/10 flex items-center justify-center">
                                <Users className="h-8 w-8 text-violet-500/40" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-ink">
                                    {t('settings.family.noFamily', "You're not part of any family yet")}
                                </p>
                                <p className="text-xs text-slate mt-1">
                                    {t('settings.family.noFamilyDescription', 'Create a family to start sharing your finances')}
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-violet-500 hover:bg-violet-600 text-white"
                                leftIcon={<Users className="h-4 w-4" />}
                            >
                                {t('settings.family.createFamily', 'Create Family')}
                            </Button>
                        </div>
                    ) : (
                        /* Family Exists */
                        <div className="space-y-4">
                            {/* Family Name */}
                            <div className="flex items-center justify-between p-3 bg-mist rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-ink">{activeFamily?.name}</p>
                                        <p className="text-xs text-slate">
                                            {t('settings.family.membersCount', '{{count}} member(s)', { count: activeFamily?.members.length || 0 })}
                                            {' • '}
                                            {getRoleLabel(activeFamily?.myRole || 'member')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Members List */}
                            <div>
                                <p className="text-xs font-medium text-slate uppercase tracking-wide mb-2">
                                    {t('settings.family.members', 'Members')}
                                </p>
                                <div className="space-y-1">
                                    {activeFamily?.members.map((member) => (
                                        <div key={member.id} className="space-y-1">
                                            <div
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 rounded-xl transition-colors",
                                                    member.userId === user?.uid ? 'bg-blue/5' : 'bg-white/50 hover:bg-white/80'
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {member.photoURL ? (
                                                        <img
                                                            src={member.photoURL}
                                                            alt={member.displayName}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate/10"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue/20 to-indigo/20 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-blue" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-ink truncate">
                                                            {member.displayName}
                                                            {member.userId === user?.uid && (
                                                                <span className="text-xs text-slate ml-1">
                                                                    ({t('settings.family.you', 'you')})
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate truncate">{member.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 ml-1">
                                                        {getRoleIcon(member.role)}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    {/* Edit Permissions - for anyone that is NOT me */}
                                                    {member.userId !== user?.uid && (
                                                        <button
                                                            onClick={() => setEditingMemberId(member.id)}
                                                            className="p-1.5 rounded-lg text-slate hover:text-violet-600 hover:bg-violet-50 transition-colors flex-shrink-0"
                                                            title={t('settings.family.editPermissions', 'Edit Permissions')}
                                                        >
                                                            <Settings className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Remove button — only for owners/admins, not for the owner themselves and not for me (if I'm admin/owner removing others) */}
                                                    {canManage && member.role !== 'owner' && member.userId !== user?.uid && (
                                                        <button
                                                            onClick={() => setRemovingMemberId(removingMemberId === member.id ? null : member.id)}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-colors flex-shrink-0",
                                                                removingMemberId === member.id ? "bg-rose text-white" : "text-slate hover:text-rose hover:bg-rose/10"
                                                            )}
                                                            title={t('settings.family.removeMember', 'Remove member')}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Leave button — for any member that is NOT the owner (me leaving) */}
                                                    {member.userId === user?.uid && member.role !== 'owner' && (
                                                        <button
                                                            onClick={() => setRemovingMemberId(removingMemberId === member.id ? null : member.id)}
                                                            className={cn(
                                                                "p-1.5 rounded-lg transition-colors flex-shrink-0",
                                                                removingMemberId === member.id ? "bg-rose text-white" : "text-slate hover:text-rose hover:bg-rose/10"
                                                            )}
                                                            title={t('settings.family.leaveFamily', 'Leave Family')}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Inline Confirmation for Member Removal / Leaving */}
                                            {removingMemberId === member.id && (
                                                <div className="mx-2 mb-2 p-3 bg-rose/5 border border-rose/20 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <p className="text-sm font-medium text-rose">
                                                        {member.userId === user?.uid
                                                            ? t('settings.family.leaveConfirmTitle', 'Leave this family?')
                                                            : t('settings.family.removeMemberConfirmTitle', 'Remove member?')}
                                                    </p>
                                                    <p className="text-xs text-slate">
                                                        {member.userId === user?.uid
                                                            ? t('settings.family.leaveConfirmDescription', 'You will lose access to shared data and will no longer appear in family reports.')
                                                            : t('settings.family.removeMemberConfirmDescription', 'Are you sure you want to remove this member from the family?')}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="danger"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="text-xs py-1 h-8"
                                                            isLoading={loading}
                                                        >
                                                            {member.userId === user?.uid ? t('settings.family.leaveFamily', 'Leave Family') : t('common.remove', 'Remove')}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => setRemovingMemberId(null)}
                                                            className="text-xs py-1 h-8"
                                                        >
                                                            {t('common.cancel', 'Cancel')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {canManage && (
                                    <Button
                                        onClick={() => setShowInviteModal(true)}
                                        className="bg-violet-500 hover:bg-violet-600 text-white"
                                        leftIcon={<UserPlus className="h-4 w-4" />}
                                    >
                                        {t('settings.family.inviteMember', 'Invite Member')}
                                    </Button>
                                )}
                                {activeFamily?.myRole === 'owner' && (
                                    <Button
                                        variant="danger"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        leftIcon={<Trash2 className="h-4 w-4" />}
                                    >
                                        {t('settings.family.deleteFamily', 'Delete Family')}
                                    </Button>
                                )}
                            </div>

                            {/* Delete Confirmation */}
                            {showDeleteConfirm && (
                                <div className="p-3 bg-rose/5 border border-rose/20 rounded-xl space-y-2">
                                    <p className="text-sm font-medium text-rose">
                                        {t('settings.family.deleteConfirmTitle', 'Delete this family?')}
                                    </p>
                                    <p className="text-xs text-slate">
                                        {t('settings.family.deleteConfirmDescription', 'This will remove all members and shared data. This action cannot be undone.')}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="danger"
                                            onClick={handleDeleteFamily}
                                            className="text-xs"
                                        >
                                            {t('common.delete', 'Delete')}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-xs"
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <FamilyCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateFamily}
            />

            {activeFamily && (
                <>
                    <FamilyInviteModal
                        isOpen={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        onSubmit={handleSendInvite}
                        familyName={activeFamily.name}
                    />

                    <FamilySharingModal
                        isOpen={!!editingMemberId}
                        onClose={() => setEditingMemberId(null)}
                        onSave={handleSavePermissions}
                        memberName={getEditingMemberName()}
                        initialPermissions={getEditingMemberPermissions()}
                    />
                </>
            )}
        </>
    );
}
