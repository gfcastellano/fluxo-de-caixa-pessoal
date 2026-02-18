import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'preview' | 'processing' | 'success' | 'error';

export interface UseVoiceRecorderReturn {
  state: RecordingState;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  reset: () => void;
  isSupported: boolean;
  // New: Audio level for waveform visualization (0-100)
  getAudioLevel: () => number;
  // New: Recorded audio blob for preview
  audioBlob: Blob | null;
  // New: Clear recorded audio (discard)
  clearAudio: () => void;
  // New: Confirm audio and move to processing
  confirmAudio: () => Blob | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if browser supports MediaRecorder
  const isSupported = typeof window !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  // Get current audio level (0-100) for waveform visualization
  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current || !dataArrayRef.current || state !== 'recording') {
      return 0;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate average volume from frequency data
    const sum = dataArrayRef.current.reduce((acc, val) => acc + val, 0);
    const average = sum / dataArrayRef.current.length;

    // Normalize to 0-100 scale with boost for lower volumes
    // Using simple linear math wasn't sensitive enough.
    // We use a root curve to boost low signals and a multiplier
    const normalized = Math.min(100, Math.pow(average / 255, 0.8) * 100 * 2.5);
    return Math.round(normalized);
  }, [state]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser');
      setState('error');
      return;
    }

    try {
      setError(null);
      setAudioBlob(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Setup AudioContext and AnalyserNode for waveform visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Create MediaRecorder with webm/opus format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        setState('error');
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');

    } catch (err) {
      console.error('Error starting recording:', err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError('Failed to start recording');
      }

      setState('error');
    }
  }, [isSupported]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || state !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        // Stop audio context but keep stream alive for potential re-recording
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Combine all chunks into a single blob
        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType
        });

        // Clear chunks
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (blob.size === 0) {
          setError('No audio recorded');
          setState('error');
          resolve(null);
        } else {
          // Store blob for preview and move to preview state
          setAudioBlob(blob);
          setState('preview');
          resolve(blob);
        }
      };

      mediaRecorder.stop();
    });
  }, [state]);

  // Clear recorded audio (user cancelled)
  const clearAudio = useCallback(() => {
    setAudioBlob(null);
    audioChunksRef.current = [];
    setState('idle');
    setError(null);
  }, []);

  // Confirm audio for processing (user approved)
  const confirmAudio = useCallback((): Blob | null => {
    if (!audioBlob) return null;
    setState('processing');
    return audioBlob;
  }, [audioBlob]);

  const reset = useCallback(() => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    analyserRef.current = null;
    dataArrayRef.current = null;

    setAudioBlob(null);
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    reset,
    isSupported,
    getAudioLevel,
    audioBlob,
    clearAudio,
    confirmAudio,
  };
}
