import type { ReactNode } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { Portal } from './Portal';

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
    /** Callback to trigger voice recording from floating button */
    onVoiceClick?: () => void;
}

// ... (sound effect function code remains unchanged)

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
        <Portal>
            <div className="fixed inset-0 z-[1400] flex items-end sm:items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-ink/20 backdrop-blur-sm animate-fade-in"
                    onClick={handleCancel}
                />

                {/* Modal Container - Card floating style on mobile */}
                <div className="relative w-full sm:w-[calc(100%-2rem)] md:w-full max-w-lg h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[90dvh] md:max-h-[85dvh] flex flex-col bg-mist/95 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl animate-scale-in">
                    {/* Header - Fixed at top */}
                    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 border-b border-slate/5 flex-shrink-0">
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-ink truncate pr-2">{title}</h2>
                        <button
                            onClick={handleCancel}
                            className="p-1 sm:p-1.5 md:p-2 text-slate hover:text-ink hover:bg-slate/10 rounded-full transition-colors flex-shrink-0"
                        >
                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>

                    {/* Content - Scrollable with safe area support */}
                    <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-4 pb-[env(safe-area-inset-bottom,0px)] overflow-y-auto flex-1 custom-scrollbar">
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
        </Portal>
    );
}
