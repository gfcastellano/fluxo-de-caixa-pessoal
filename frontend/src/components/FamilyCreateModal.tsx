import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';

interface FamilyCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string) => Promise<void>;
}

export function FamilyCreateModal({ isOpen, onClose, onSubmit }: FamilyCreateModalProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(name.trim());
            setName('');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            onSubmit={handleSubmit}
            title={t('settings.family.createFamily', 'Create Family')}
            submitLabel={isSubmitting
                ? t('common.loading', 'Loading...')
                : t('common.create', 'Create')
            }
            cancelLabel={t('common.cancel', 'Cancel')}
            isSubmitDisabled={!name.trim() || isSubmitting}
        >
            <Input
                label={t('settings.family.familyName', 'Family Name')}
                placeholder={t('settings.family.familyNamePlaceholder', 'e.g., The Smiths')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
            />
            <p className="text-xs text-slate">
                {t('settings.family.createDescription', 'You will be the owner of this family. You can invite other members after creating it.')}
            </p>
        </BaseModal>
    );
}
