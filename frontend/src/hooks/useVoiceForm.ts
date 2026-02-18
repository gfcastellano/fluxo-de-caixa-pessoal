import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';

export interface UseVoiceFormOptions {
    /** Whether to auto-start recording when enabled */
    autoStartRecording?: boolean;
    /** Callback when recording is auto-started */
    onAutoStart?: () => void;
}

export interface UseVoiceFormReturn {
    // Voice state
    voiceState: 'idle' | 'recording' | 'preview' | 'processing' | 'success' | 'error';
    isProcessingVoice: boolean;
    hasVoiceData: boolean;
    voiceFeedback: { type: 'success' | 'error'; message: string } | null;

    // Actions
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    cancelRecording: () => void;
    resetVoice: () => void;

    // Processing helpers
    setProcessing: (isProcessing: boolean) => void;
    setVoiceDataReceived: () => void;
    showFeedback: (type: 'success' | 'error', message: string) => void;
    clearFeedback: () => void;
    audioBlob: Blob | null;
    getAudioLevel: () => number;
}

// Sound effect for starting recording
const playStartSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880; // A5 note - high pitch for start
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        // Sound not critical, ignore errors
    }
};

// Sound effect for stopping recording
const playStopSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // First beep
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 660; // E5 note
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.1);

        // Second beep
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 440; // A4 note
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.25, audioContext.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
        osc2.start(audioContext.currentTime + 0.12);
        osc2.stop(audioContext.currentTime + 0.25);
    } catch (e) {
        // Sound not critical
    }
};

export function useVoiceForm(options: UseVoiceFormOptions = {}): UseVoiceFormReturn {
    const { autoStartRecording = false, onAutoStart } = options;

    const recorder = useVoiceRecorder();
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [hasVoiceData, setHasVoiceData] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const hasAutoStarted = useRef(false);
    const wasCancelled = useRef(false); // Prevent auto-restart after manual cancel

    // Auto-start recording if enabled (but NOT if user cancelled)
    useEffect(() => {
        if (autoStartRecording && recorder.state === 'idle' && !hasAutoStarted.current && !wasCancelled.current) {
            hasAutoStarted.current = true;
            const timer = setTimeout(() => {
                playStartSound();
                recorder.startRecording();
                onAutoStart?.();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoStartRecording, recorder.state, recorder.startRecording, onAutoStart]);

    // Reset auto-start flag when recorder resets
    useEffect(() => {
        if (recorder.state === 'idle') {
            // Keep hasAutoStarted true until component unmounts or autoStartRecording changes
        }
    }, [recorder.state]);


    const startRecording = useCallback(async () => {
        setVoiceFeedback(null);
        playStartSound();
        await recorder.startRecording();
    }, [recorder]);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        playStopSound();
        return await recorder.stopRecording();
    }, [recorder]);

    const cancelRecording = useCallback(() => {
        // Play stop sound when cancelling
        playStopSound();
        // Mark as cancelled to prevent auto-restart
        wasCancelled.current = true;
        recorder.reset();
    }, [recorder]);

    const resetVoice = useCallback(() => {
        recorder.reset();
        setIsProcessingVoice(false);
        setHasVoiceData(false);
        setVoiceFeedback(null);
        hasAutoStarted.current = false;
        wasCancelled.current = false; // Reset so next modal open can auto-start
    }, [recorder]);

    const setProcessing = useCallback((isProcessing: boolean) => {
        setIsProcessingVoice(isProcessing);
    }, []);

    const setVoiceDataReceived = useCallback(() => {
        setHasVoiceData(true);
    }, []);

    const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
        setVoiceFeedback({ type, message });

        // Prevent auto-restart after successful voice processing
        // The user should manually click to record again
        if (type === 'success') {
            wasCancelled.current = true; // Reuse this flag to block auto-restart
        }

        // Auto-clear after delay
        setTimeout(() => {
            setVoiceFeedback(null);
            recorder.reset();
        }, type === 'success' ? 3000 : 5000);
    }, [recorder]);

    const clearFeedback = useCallback(() => {
        setVoiceFeedback(null);
    }, []);

    return {
        voiceState: recorder.state,
        isProcessingVoice,
        hasVoiceData,
        voiceFeedback,
        startRecording,
        stopRecording,
        cancelRecording,
        resetVoice,
        setProcessing,
        setVoiceDataReceived,
        showFeedback,
        clearFeedback,
        audioBlob: recorder.audioBlob,
        getAudioLevel: recorder.getAudioLevel,
    };
}
