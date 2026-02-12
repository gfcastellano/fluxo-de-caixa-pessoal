import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { FamilySharingConfig } from './FamilySharingConfig';
import type { SharingPermissions } from '../types/family';


interface FamilySharingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (permissions: SharingPermissions) => Promise<void>;
    memberName: string;
    initialPermissions: SharingPermissions;
}

export function FamilySharingModal({
    isOpen,
    onClose,
    onSave,
    memberName,
    initialPermissions,
}: FamilySharingModalProps) {
    const { t } = useTranslation();
    const [permissions, setPermissions] = useState<SharingPermissions>(initialPermissions);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset permissions when modal opens with new initialPermissions
    useEffect(() => {
        if (isOpen) {
            setPermissions(initialPermissions);
        }
    }, [isOpen, initialPermissions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSave(permissions);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setPermissions(initialPermissions);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            title={t('settings.family.sharing.editTitle', 'Edit Sharing Permissions')}
            submitLabel={isSubmitting
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save')
            }
            cancelLabel={t('common.cancel', 'Cancel')}
            isSubmitDisabled={isSubmitting}
        >
            <p className="text-xs text-slate mb-3">
                {t('settings.family.sharing.editDescription', 'Control what data you share with {{name}}.', { name: memberName })}
            </p>

            <FamilySharingConfig
                permissions={permissions}
                onChange={setPermissions}
            />
        </BaseModal>
    );
}
