import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

interface AudioPreviewModalProps {
    isOpen: boolean;
    audioBlob: Blob | null;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

/**
 * Modal for previewing recorded audio before sending.
 * Allows user to play, re-record, or send the recording.
 */
export function AudioPreviewModal({
    isOpen,
    audioBlob,
    onConfirm,
    onCancel,
    isProcessing = false,
}: AudioPreviewModalProps) {
    const { t } = useTranslation();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);

    // Create audio URL when blob changes
    useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setAudioUrl(null);
        }
    }, [audioBlob]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsPlaying(false);
            setCurrentTime(0);
        }
    }, [isOpen]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-mist/95 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl animate-scale-in p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-ink">
                        {t('voice.previewTitle', 'Revisar Áudio')}
                    </h3>
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="p-2 text-slate hover:text-ink hover:bg-slate/10 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Audio Player */}
                <div className="bg-white/50 rounded-2xl p-4 mb-6">
                    {audioUrl && (
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            className="hidden"
                        />
                    )}

                    {/* Waveform Visualization (Static) */}
                    <div className="flex items-center justify-center gap-1 h-16 mb-4">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "w-1 rounded-full transition-all duration-150",
                                    currentTime / duration > i / 30
                                        ? "bg-teal"
                                        : "bg-slate/20"
                                )}
                                style={{
                                    height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`
                                }}
                            />
                        ))}
                    </div>

                    {/* Time Display */}
                    <div className="flex items-center justify-between text-sm text-slate">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Play/Pause Button */}
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={handlePlayPause}
                            disabled={isProcessing}
                            className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
                                "bg-gradient-to-br from-teal to-teal-hover text-white shadow-lg",
                                "hover:scale-105 active:scale-95 disabled:opacity-50"
                            )}
                        >
                            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isProcessing}
                        leftIcon={<RotateCcw className="h-4 w-4" />}
                        className="flex-1 text-slate"
                    >
                        {t('voice.reRecord', 'Regravar')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        leftIcon={<Send className="h-4 w-4" />}
                        className="flex-1 bg-teal hover:bg-teal-hover"
                    >
                        {isProcessing
                            ? t('voice.processing', 'Processando...')
                            : t('voice.send', 'Enviar')
                        }
                    </Button>
                </div>
            </div>
        </div>
    );
}
