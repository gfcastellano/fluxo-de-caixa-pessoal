import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { FamilySharingConfig } from './FamilySharingConfig';
import type { SharingPermissions } from '../types/family';
import { DEFAULT_SHARING_PERMISSIONS } from '../types/family';

interface FamilyInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (email: string, permissions: SharingPermissions) => Promise<void>;
    familyName: string;
}

export function FamilyInviteModal({ isOpen, onClose, onSubmit, familyName }: FamilyInviteModalProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [permissions, setPermissions] = useState<SharingPermissions>(DEFAULT_SHARING_PERMISSIONS);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(email.trim(), permissions);
            setEmail('');
            setPermissions(DEFAULT_SHARING_PERMISSIONS);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setPermissions(DEFAULT_SHARING_PERMISSIONS);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            title={t('settings.family.inviteMember', 'Invite Member')}
            submitLabel={isSubmitting
                ? t('common.loading', 'Loading...')
                : t('settings.family.sendInvite', 'Send Invitation')
            }
            cancelLabel={t('common.cancel', 'Cancel')}
            isSubmitDisabled={!email.trim() || isSubmitting}
        >
            <p className="text-xs text-slate mb-3">
                {t('settings.family.inviteDescription', 'Invite someone to join "{{familyName}}". Choose what data you want to share.', { familyName })}
            </p>

            <Input
                label={t('settings.family.inviteEmail', 'Email Address')}
                type="email"
                placeholder={t('settings.family.inviteEmailPlaceholder', 'person@email.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
            />

            <div className="mt-4">
                <p className="text-sm font-medium text-ink mb-2">
                    {t('settings.family.permissionsTitle', 'What do you want to share?')}
                </p>
                <FamilySharingConfig
                    permissions={permissions}
                    onChange={setPermissions}
                />
            </div>
        </BaseModal>
    );
}
