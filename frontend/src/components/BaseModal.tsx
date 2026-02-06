import type { ReactNode } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (e: React.FormEvent) => void;
    title: string;
    children: ReactNode;
    submitLabel?: string;
    cancelLabel?: string;
    submitIcon?: ReactNode;
    cancelIcon?: ReactNode;
    isSubmitDisabled?: boolean;
    /** Whether the form has voice data, changes submit button label */
    hasVoiceData?: boolean;
    /** Whether the modal is for editing an existing item */
    isEditing?: boolean;
    /** Whether voice is currently recording */
    isRecording?: boolean;
    /** Callback to cancel/stop recording (called before closing if recording) */
    onCancelRecording?: () => void;
}

// Sound effect for cancel action (only when stopping recording)
const playCancelSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // First beep
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 660; // E5 note - lower pitch for stop
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.1);

        // Second beep (slightly delayed)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 440; // A4 note - even lower
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.25, audioContext.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        osc2.start(audioContext.currentTime + 0.12);
        osc2.stop(audioContext.currentTime + 0.25);
    } catch (e) {
        // Sound not critical, ignore errors
    }
};

export function BaseModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    children,
    submitLabel,
    cancelLabel = 'Cancelar',
    submitIcon,
    cancelIcon,
    isSubmitDisabled = false,
    hasVoiceData = false,
    isEditing = false,
    isRecording = false,
    onCancelRecording,
}: BaseModalProps) {
    if (!isOpen) return null;

    const handleCancel = () => {
        // If recording, cancel it first (cancelRecording plays the sound)
        if (isRecording && onCancelRecording) {
            onCancelRecording();
        }
        onClose();
    };

    const defaultSubmitLabel = hasVoiceData || isEditing ? 'Atualizar' : 'Criar';

    return (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/20 backdrop-blur-sm animate-fade-in"
                onClick={handleCancel}
            />

            {/* Modal Container - Always centered, with max height to fit viewport */}
            <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-mist/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl animate-scale-in">
                {/* Header - Fixed at top */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/5 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-ink">{title}</h2>
                    <button
                        onClick={handleCancel}
                        className="p-2 text-slate hover:text-ink hover:bg-slate/10 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {onSubmit ? (
                        <form onSubmit={onSubmit} className="space-y-4">
                            {children}

                            {/* Action buttons */}
                            <div className="flex flex-row gap-3 pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSubmitDisabled}
                                    className="flex-1 rounded-xl bg-emerald hover:bg-emerald/90 text-white shadow-lg shadow-emerald/20"
                                    leftIcon={submitIcon || <Check className="h-4 w-4" />}
                                >
                                    {submitLabel || defaultSubmitLabel}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="flex-1 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                                    leftIcon={cancelIcon || <X className="h-4 w-4" />}
                                >
                                    {cancelLabel}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {children}
                            <div className="flex flex-row gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="flex-1 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
                                    leftIcon={cancelIcon || <X className="h-4 w-4" />}
                                >
                                    {cancelLabel}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
