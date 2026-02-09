import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Shield, Clock, FileText, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { Portal } from './Portal';
import { saveVoiceConsent as saveVoiceConsentToServer } from '../services/voiceService';

interface VoiceConsentModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

// LocalStorage key for voice consent (fallback for offline)
const VOICE_CONSENT_KEY = 'voice_consent_accepted';
const VOICE_CONSENT_VERSION = '1.0';

/**
 * Check if user has already given voice consent (localStorage fallback)
 */
export function hasVoiceConsent(): boolean {
    try {
        return localStorage.getItem(VOICE_CONSENT_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Save voice consent to localStorage (fallback for offline)
 */
export function saveVoiceConsentLocal(accepted: boolean): void {
    try {
        if (accepted) {
            localStorage.setItem(VOICE_CONSENT_KEY, 'true');
        } else {
            localStorage.removeItem(VOICE_CONSENT_KEY);
        }
    } catch {
        // Ignore localStorage errors
    }
}

/**
 * Save voice consent to Firestore via backend
 * Also saves to localStorage as fallback
 */
export async function saveVoiceConsent(accepted: boolean): Promise<void> {
    // Always save to localStorage as fallback
    saveVoiceConsentLocal(accepted);

    // Save to Firestore via backend
    try {
        const result = await saveVoiceConsentToServer(accepted, VOICE_CONSENT_VERSION);
        if (!result.success) {
            console.error('Failed to save voice consent to server:', result.error);
        }
    } catch (error) {
        console.error('Error saving voice consent to server:', error);
        // Don't throw - localStorage is the fallback
    }
}

/**
 * Voice Consent Modal
 *
 * Displays consent information for voice transcription using OpenAI.
 * Required for compliance with OpenAI terms of service and user data protection.
 */
export function VoiceConsentModal({ isOpen, onAccept, onDecline }: VoiceConsentModalProps) {
    const { t } = useTranslation();
    const [isChecked, setIsChecked] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Handle animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Reset checkbox when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsChecked(false);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    const handleAccept = async () => {
        if (!isChecked) return;
        await saveVoiceConsent(true);
        onAccept();
    };

    const handleDecline = async () => {
        await saveVoiceConsent(false);
        onDecline();
    };

    return (
        <Portal>
            <div
                className={cn(
                    'fixed inset-0 z-[1500] flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden',
                    'transition-opacity duration-200',
                    isOpen ? 'opacity-100' : 'opacity-0'
                )}
            >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
                onClick={handleDecline}
            />

            {/* Modal Container */}
            <div
                className={cn(
                    'relative w-[calc(100%-0.5rem)] sm:w-full max-w-md flex flex-col',
                    'max-h-[92vh] sm:max-h-[90vh]',
                    'bg-mist/95 backdrop-blur-xl',
                    'border border-white/50',
                    'rounded-xl sm:rounded-2xl',
                    'shadow-2xl',
                    'transition-all duration-200',
                    'overflow-hidden',
                    isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-2 sm:gap-3 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 border-b border-slate/10 flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue/10 text-blue">
                        <Mic className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-ink">
                            {t('voice.consent.title')}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate">
                            {t('voice.consent.subtitle')}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                    {/* Explanation */}
                    <div className="space-y-2 sm:space-y-3">
                        <ConsentItem
                            icon={<Mic className="h-4 w-4" />}
                            title={t('voice.consent.processingTitle')}
                            description={t('voice.consent.processingDescription')}
                        />

                        <ConsentItem
                            icon={<Clock className="h-4 w-4" />}
                            title={t('voice.consent.retentionTitle')}
                            description={t('voice.consent.retentionDescription')}
                        />

                        <ConsentItem
                            icon={<Shield className="h-4 w-4" />}
                            title={t('voice.consent.usageTitle')}
                            description={t('voice.consent.usageDescription')}
                        />

                        <ConsentItem
                            icon={<FileText className="h-4 w-4" />}
                            title={t('voice.consent.termsTitle')}
                            description={t('voice.consent.termsDescription')}
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate/10" />

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div
                                className={cn(
                                    'w-5 h-5 rounded border-2 transition-all duration-200',
                                    'flex items-center justify-center',
                                    'border-slate/30 bg-white',
                                    'peer-checked:border-blue peer-checked:bg-blue',
                                    'peer-focus:ring-2 peer-focus:ring-blue/20 peer-focus:ring-offset-1',
                                    'group-hover:border-blue/50'
                                )}
                            >
                                <Check
                                    className={cn(
                                        'h-3 w-3 text-white transition-transform duration-200',
                                        isChecked ? 'scale-100' : 'scale-0'
                                    )}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-ink leading-relaxed">
                            {t('voice.consent.checkboxLabel')}
                        </span>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex flex-row gap-2 sm:gap-3 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 border-t border-slate/10 bg-white/30 rounded-b-xl sm:rounded-b-2xl flex-shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDecline}
                        className="flex-1 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                    >
                        {t('voice.consent.decline')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAccept}
                        disabled={!isChecked}
                        className="flex-1 rounded-xl bg-emerald hover:bg-emerald/90 text-white shadow-lg shadow-emerald/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        leftIcon={<Check className="h-4 w-4" />}
                    >
                        {t('voice.consent.accept')}
                    </Button>
                </div>
            </div>
            </div>
        </Portal>
    );
}

interface ConsentItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function ConsentItem({ icon, title, description }: ConsentItemProps) {
    return (
        <div className="flex gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate/5 flex items-center justify-center text-slate">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-medium text-ink mb-0">{title}</h3>
                <p className="text-xs text-slate leading-snug sm:leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
