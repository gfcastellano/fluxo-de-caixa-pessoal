import { useTranslation } from 'react-i18next';
import { Plus, Mic, Tag, Landmark, PiggyBank } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import { cn } from '../utils/cn';

/**
 * VoiceHeroButton - The central floating action button for voice input.
 * When clicked, it opens the corresponding form modal for the current page.
 */
export function VoiceHeroButton() {
    const { t } = useTranslation();
    const {
        currentPageType,
        isEditing,
        requestOpenModal,
    } = useVoice();

    // Determine the icon based on page type
    const getIcon = () => {
        switch (currentPageType) {
            case 'transaction':
                return isEditing ? <Mic size={28} /> : <Plus size={28} />;
            case 'category':
                return isEditing ? <Mic size={28} /> : <Tag size={24} />;
            case 'account':
                return isEditing ? <Mic size={28} /> : <Landmark size={24} />;
            case 'budget':
                return isEditing ? <Mic size={28} /> : <PiggyBank size={24} />;
            default:
                return <Plus size={28} />;
        }
    };

    // Get aria label based on context
    const getAriaLabel = () => {
        if (isEditing) return t('voice.updateByVoice', 'Atualizar por voz');

        switch (currentPageType) {
            case 'transaction':
                return t('voice.addTransaction', 'Adicionar transação');
            case 'category':
                return t('voice.addCategory', 'Adicionar categoria');
            case 'account':
                return t('voice.addAccount', 'Adicionar conta');
            case 'budget':
                return t('voice.addBudget', 'Adicionar orçamento');
            default:
                return t('voice.add', 'Adicionar');
        }
    };

    // Get context label
    const getContextLabel = () => {
        if (isEditing) return t('voice.edit', 'Editar');

        switch (currentPageType) {
            case 'transaction':
                return t('voice.add', 'Novo');
            case 'category':
                return t('voice.category', 'Categoria');
            case 'account':
                return t('voice.account', 'Conta');
            case 'budget':
                return t('voice.budget', 'Orçamento');
            default:
                return '';
        }
    };

    const handleClick = () => {
        // Request the page to open its form modal
        requestOpenModal();
    };

    return (
        <div className="relative group">
            {/* Main Button */}
            <button
                onClick={handleClick}
                className={cn(
                    "relative flex items-center justify-center w-14 h-14 rounded-full shadow-float-button transition-all duration-300 z-10",
                    "bg-gradient-to-br from-blue to-blue-hover text-white hover:scale-105",
                    "active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue/20"
                )}
                aria-label={getAriaLabel()}
            >
                {getIcon()}
            </button>

            {/* Context Label */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-slate">
                {getContextLabel()}
            </div>
        </div>
    );
}
