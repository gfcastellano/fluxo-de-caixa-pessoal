import { useEffect, useRef, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useVoice } from '../context/VoiceContext';
import { cn } from '../utils/cn';

interface VoiceRecordingPillProps {
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
    getAudioLevel?: () => number;
    isProcessing?: boolean;
}

export function VoiceRecordingPill({
    onConfirm,
    onCancel,
    getAudioLevel: propGetAudioLevel,
    isProcessing: propIsProcessing
}: VoiceRecordingPillProps) {
    const {
        stopRecording,
        cancelAudio,
        confirmAudio,
        getAudioLevel: ctxGetAudioLevel,
        isProcessing: ctxIsProcessing
    } = useVoice();

    const getAudioLevel = propGetAudioLevel || ctxGetAudioLevel;
    const isProcessing = propIsProcessing !== undefined ? propIsProcessing : ctxIsProcessing;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const historyRef = useRef<number[]>(new Array().fill(0)); // Keep last 40 samples

    const lastUpdateRef = useRef<number>(0);
    const currentMaxRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');

            if (canvas && ctx) {
                // Constants for layout
                const width = canvas.width;
                const height = canvas.height;
                const barWidth = 2; // Thinner bars for more density
                const gap = 1;
                const stride = barWidth + gap;
                const maxBars = Math.floor(width / stride); // ~66 bars for 200px

                // Target: ~10 seconds history
                // 10000ms / 66 bars ≈ 150ms per bar update
                const updateInterval = 150;

                const now = Date.now();
                const currentLevel = getAudioLevel();

                // Track peak level during the interval
                currentMaxRef.current = Math.max(currentMaxRef.current, currentLevel);

                // Update history only when interval passes
                if (now - lastUpdateRef.current > updateInterval) {
                    historyRef.current.push(currentMaxRef.current);
                    currentMaxRef.current = 0; // Reset for next interval
                    lastUpdateRef.current = now;

                    // Keep history within bounds
                    if (historyRef.current.length > maxBars) {
                        historyRef.current.shift();
                    }
                }

                // --- Drawing ---
                ctx.clearRect(0, 0, width, height);

                const center = height / 2;
                ctx.fillStyle = '#3b82f6'; // blue-500 (more visible on white)

                // Calculate starting X position so bars are right-aligned
                // We subtract an extra stride to leave space for the "live" bar at the very end
                const totalHistoryWidth = historyRef.current.length * stride;
                const startX = width - totalHistoryWidth - stride;

                // 1. Draw finalized history bars
                historyRef.current.forEach((val, i) => {
                    const barHeight = Math.max(2, (val / 100) * (height - 4));
                    // Position relative to the calculated startX
                    const x = startX + (i * stride);

                    // Don't draw if off-screen to the left (optimization)
                    if (x + barWidth < 0) return;

                    const y = center - barHeight / 2;

                    ctx.beginPath();
                    // Draw rect manual for wider support or roundRect
                    if (ctx.roundRect) {
                        ctx.roundRect(x, y, barWidth, barHeight, 2);
                    } else {
                        ctx.rect(x, y, barWidth, barHeight);
                    }
                    ctx.fill();
                });

                // 2. Draw current "live" bar at the end (responsive feedback)
                // Always position it at the far right edge (width - stride)
                const liveX = width - stride;

                if (liveX >= 0) { // Only draw if visible
                    // Use immediate level for "aliveness" or currentMax for "building"
                    // Let's use currentLevel for immediate feedback, but visually distinct?
                    // Or just same style.
                    const liveHeight = Math.max(2, (currentLevel / 100) * (height - 4));
                    const liveY = center - liveHeight / 2;

                    ctx.fillStyle = '#60a5fa'; // blue-400 (lighter blue for live bar)
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(liveX, liveY, barWidth, liveHeight, 2);
                    } else {
                        ctx.rect(liveX, liveY, barWidth, liveHeight);
                    }
                    ctx.fill();
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [getAudioLevel]);

    const handleConfirm = async () => {
        if (onConfirm) {
            await onConfirm();
        } else {
            // Stop first, then confirm
            await stopRecording();
            await confirmAudio();
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            stopRecording();
            cancelAudio();
        }
    };

    return (
        <div className={cn(
            "flex items-center gap-3 pr-2 pl-4 py-2",
            "bg-white shadow-float-button",
            "border border-slate-100 rounded-full",
            "animate-in fade-in zoom-in-95 duration-200"
        )}>
            {/* Cancel Button */}
            <button
                type="button"
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                aria-label="Cancelar gravação"
            >
                <X size={20} />
            </button>

            {/* Waveform Visualization */}
            <div className="flex items-center h-8">
                <canvas
                    ref={canvasRef}
                    width={200}
                    height={32}
                    className="w-[200px] h-8"
                />
            </div>

            {/* Confirm Button */}
            <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className={cn(
                    "p-2 rounded-full transition-colors",
                    "text-white bg-blue hover:bg-blue-hover shadow-sm",
                    isProcessing && "opacity-50 cursor-not-allowed"
                )}
                aria-label="Confirmar gravação"
            >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            </button>
        </div>
    );
}
