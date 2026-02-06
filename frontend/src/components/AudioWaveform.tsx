import { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

interface AudioWaveformProps {
    getAudioLevel: () => number;
    isActive: boolean;
    barCount?: number;
    className?: string;
}

/**
 * Animated audio waveform visualization component.
 * Displays bars that react to audio input levels in real-time.
 */
export function AudioWaveform({
    getAudioLevel,
    isActive,
    barCount = 5,
    className
}: AudioWaveformProps) {
    const barsRef = useRef<HTMLDivElement[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isActive) {
            // Reset bars when not active
            barsRef.current.forEach(bar => {
                if (bar) bar.style.height = '20%';
            });
            return;
        }

        const animate = () => {
            const level = getAudioLevel();

            // Create variation for each bar based on the audio level
            barsRef.current.forEach((bar, index) => {
                if (!bar) return;

                // Add some randomness and wave effect
                const offset = Math.sin(Date.now() / 100 + index * 0.5) * 15;
                const variation = (Math.random() * 20) - 10;
                const height = Math.max(20, Math.min(100, level + offset + variation));

                bar.style.height = `${height}%`;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isActive, getAudioLevel]);

    return (
        <div className={cn(
            "flex items-center justify-center gap-1 h-8",
            className
        )}>
            {Array.from({ length: barCount }).map((_, index) => (
                <div
                    key={index}
                    ref={el => { if (el) barsRef.current[index] = el; }}
                    className={cn(
                        "w-1 rounded-full transition-all duration-75",
                        isActive
                            ? "bg-gradient-to-t from-rose to-rose/60"
                            : "bg-slate/30"
                    )}
                    style={{
                        height: '20%',
                        animationDelay: `${index * 50}ms`
                    }}
                />
            ))}
        </div>
    );
}
