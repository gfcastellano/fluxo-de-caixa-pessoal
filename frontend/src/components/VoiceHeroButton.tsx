
import { useTranslation } from 'react-i18next';
import { Plus, Mic, Tag, Landmark, PiggyBank, CreditCard } from 'lucide-react';
import { VoiceConsentModal } from './VoiceConsentModal';
import { VoiceRecordingPill } from './VoiceRecordingPill';
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
    /** Callback for voice confirm (check button) */
    onVoiceConfirm?: () => void | Promise<void>;
    /** Callback for voice cancel (x button) */
    onVoiceCancel?: () => void;
    /** Callback to get audio level for visualization */
    getAudioLevel?: () => number;
    /** Whether voice is processing */
    isProcessing?: boolean;
}

/**
 * VoiceHeroButton - The central floating action button for voice input.
 * Can be used globally (connected to context) or locally (driven by props).
 */
export function VoiceHeroButton({
    onClick,
    isRecording: propIsRecording,
    pageType,
    className,
    onVoiceConfirm,
    onVoiceCancel,
    getAudioLevel,
    isProcessing
}: VoiceHeroButtonProps = {}) {
    const { t } = useTranslation();
    const {
        currentPageType,
        isEditing,
        isRecording: ctxIsRecording,
        isPermissionDenied,
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
                return (isEditing || isModalActive) ? <Mic size={28} /> : <Plus size={28} />;
            case 'category':
                return (isEditing || isModalActive) ? <Mic size={28} /> : <Tag size={24} />;
            case 'account':
                return (isEditing || isModalActive) ? <Mic size={28} /> : <Landmark size={24} />;
            case 'budget':
                return (isEditing || isModalActive) ? <Mic size={28} /> : <PiggyBank size={24} />;
            case 'credit_card':
                return (isEditing || isModalActive) ? <Mic size={28} /> : <CreditCard size={24} />;
            default:
                return <Plus size={28} />;
        }
    };

    // Get aria label based on context
    const getAriaLabel = () => {
        if (isRecording) return t('voice.listening', 'Ouvindo...');
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
            case 'credit_card':
                return t('voice.addCreditCard', 'Adicionar cartão');
            default:
                return t('voice.add', 'Adicionar');
        }
    };

    // Get context label
    const getContextLabel = () => {
        if (isRecording) return ''; // Label hidden when recording (Pill handles UI)
        if (isPermissionDenied) return t('voice.allowMic', 'Permitir mic');
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
            case 'credit_card':
                return t('voice.creditCard', 'Cartão');
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

    // If recording OR processing, show Pill instead of Button
    // We removed the !onClick check to allow Pill to show in modals too
    if (isRecording || isProcessing) {
        return (
            <div className={cn("relative z-50", className)}>
                <VoiceRecordingPill
                    onConfirm={onVoiceConfirm}
                    onCancel={onVoiceCancel}
                    getAudioLevel={getAudioLevel}
                    isProcessing={isProcessing}
                />
                {/* Voice Consent Modal - relevant if this button triggers consent */}
                <VoiceConsentModal
                    isOpen={showConsentModal}
                    onAccept={acceptConsent}
                    onDecline={declineConsent}
                />
            </div>
        );
    }

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
                )}
                aria-label={getAriaLabel()}
            >
                {getIcon()}
            </button>

            {/* Context Label */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-slate pointer-events-none">
                {getContextLabel()}
            </div>



            {/* Voice Consent Modal */}
            <VoiceConsentModal
                isOpen={showConsentModal}
                onAccept={acceptConsent}
                onDecline={declineConsent}
            />
        </div>
    );
}
