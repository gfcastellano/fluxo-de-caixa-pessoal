import { useTranslation } from 'react-i18next';
import { Plus, Mic, Tag, Landmark, PiggyBank } from 'lucide-react';
import { VoiceConsentModal } from './VoiceConsentModal';
import { useVoice, type VoicePageType } from '../context/VoiceContext';
import { cn } from '../utils/cn';

interface VoiceHeroButtonProps {
    /** Override the default click handler */
    onClick?: () => void;
    /** Override the recording state */
    isRecording?: boolean;
    /** Override the page type for icon selection */
    pageType?: VoicePageType;
    /** Additional CSS classes */
    className?: string;
}

/**
 * VoiceHeroButton - The central floating action button for voice input.
 * Can be used globally (connected to context) or locally (driven by props).
 */
export function VoiceHeroButton({
    onClick,
    isRecording: propIsRecording,
    pageType,
    className
}: VoiceHeroButtonProps = {}) {
    const { t } = useTranslation();
    const {
        currentPageType,
        isEditing,
        isRecording: ctxIsRecording,
        isModalActive,
        requestOpenModal,
        startRecording,
        stopRecording,
        hasConsent,
        showConsentModal,
        requestConsent,
        acceptConsent,
        declineConsent,
    } = useVoice();

    // Determine effective state (prop overrides context)
    const isRecording = propIsRecording !== undefined ? propIsRecording : ctxIsRecording;
    const effectivePageType = pageType !== undefined ? pageType : currentPageType;

    // Determine the icon based on page type
    const getIcon = () => {
        switch (effectivePageType) {
            case 'transaction':
                return (isEditing || isModalActive || isRecording) ? <Mic size={28} className={cn(isRecording && "animate-pulse")} /> : <Plus size={28} />;
            case 'category':
                return (isEditing || isModalActive || isRecording) ? <Mic size={28} className={cn(isRecording && "animate-pulse")} /> : <Tag size={24} />;
            case 'account':
                return (isEditing || isModalActive || isRecording) ? <Mic size={28} className={cn(isRecording && "animate-pulse")} /> : <Landmark size={24} />;
            case 'budget':
                return (isEditing || isModalActive || isRecording) ? <Mic size={28} className={cn(isRecording && "animate-pulse")} /> : <PiggyBank size={24} />;
            default:
                return <Plus size={28} />;
        }
    };

    // Get aria label based on context
    const getAriaLabel = () => {
        if (isEditing) return t('voice.updateByVoice', 'Atualizar por voz');

        switch (effectivePageType) {
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
        if (isRecording) return t('voice.listening', 'Ouvindo...');
        if (isEditing) return t('voice.edit', 'Editar');

        switch (effectivePageType) {
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

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Check consent before proceeding
        if (!hasConsent) {
            requestConsent();
            return;
        }

        // Use custom handler if provided (e.g. inside modal)
        if (onClick) {
            onClick();
            return;
        }

        // Default global behavior
        if (isRecording) {
            stopRecording();
            return;
        }

        if (isModalActive) {
            startRecording();
            return;
        }

        // Request the page to open its form modal
        requestOpenModal();
    };

    return (
        <div className={cn("relative group", className)}>
            {/* Main Button */}
            <button
                type="button" // Prevent form submission if placed inside form
                onClick={handleClick}
                className={cn(
                    "relative flex items-center justify-center w-14 h-14 rounded-full shadow-float-button transition-all duration-300 z-10",
                    "bg-gradient-to-br from-blue to-blue-hover text-white hover:scale-105",
                    "active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue/20",
                    isRecording && "ring-4 ring-red-500/30 from-red-500 to-red-600 animate-pulse"
                )}
                aria-label={getAriaLabel()}
            >
                {getIcon()}
            </button>

            {/* Context Label */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-slate pointer-events-none">
                {getContextLabel()}
            </div>

            {/* Voice Consent Modal - Only relevant if this button triggers consent requests */}
            <VoiceConsentModal
                isOpen={showConsentModal}
                onAccept={acceptConsent}
                onDecline={declineConsent}
            />
        </div>
    );
}
