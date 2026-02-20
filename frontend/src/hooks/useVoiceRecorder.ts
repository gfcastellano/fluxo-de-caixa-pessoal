import { useReducer, useRef, useCallback } from 'react';

export type RecordingState =
  | 'idle'
  | 'recording'
  | 'preview'
  | 'processing'
  | 'success'
  | 'error'
  | 'permission_denied';

export interface UseVoiceRecorderReturn {
  state: RecordingState;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  reset: () => void;
  isSupported: boolean;
  getAudioLevel: () => number;
  audioBlob: Blob | null;
  clearAudio: () => void;
  confirmAudio: () => Blob | null;
}

// ─── State & Actions ────────────────────────────────────────────────────────

interface RecorderState {
  status: RecordingState;
  error: string | null;
  audioBlob: Blob | null;
}

type RecorderAction =
  | { type: 'START' }
  | { type: 'STOP'; blob: Blob }
  | { type: 'NO_AUDIO' }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_OK' }
  | { type: 'UPLOAD_ERR'; error: string }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'DEVICE_ERROR'; error: string }
  | { type: 'RECORDER_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: RecorderState = {
  status: 'idle',
  error: null,
  audioBlob: null,
};

function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
  switch (action.type) {
    case 'START':
      return { status: 'recording', error: null, audioBlob: null };
    case 'STOP':
      return { ...state, status: 'preview', audioBlob: action.blob };
    case 'NO_AUDIO':
      return { status: 'error', error: 'Nenhum áudio gravado', audioBlob: null };
    case 'UPLOAD_START':
      return { ...state, status: 'processing' };
    case 'UPLOAD_OK':
      return { ...state, status: 'success' };
    case 'UPLOAD_ERR':
      return { status: 'error', error: action.error, audioBlob: null };
    case 'PERMISSION_DENIED':
      return {
        status: 'permission_denied',
        error: 'Permissão do microfone negada. Abra as configurações do navegador para permitir o acesso.',
        audioBlob: null,
      };
    case 'DEVICE_ERROR':
      return { status: 'error', error: action.error, audioBlob: null };
    case 'RECORDER_ERROR':
      return { status: 'error', error: action.error, audioBlob: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [recState, dispatch] = useReducer(recorderReducer, initialState);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const getAudioLevel = useCallback((): number => {
    if (!analyserRef.current || !dataArrayRef.current || recState.status !== 'recording') {
      return 0;
    }
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const sum = dataArrayRef.current.reduce((acc, val) => acc + val, 0);
    const average = sum / dataArrayRef.current.length;
    return Math.round(Math.min(100, Math.pow(average / 255, 0.8) * 100 * 2.5));
  }, [recState.status]);

  const startRecording = useCallback(async (): Promise<void> => {
    // Guard: only allow starting from idle — prevents double-submit
    if (recState.status !== 'idle') return;

    if (!isSupported) {
      dispatch({ type: 'DEVICE_ERROR', error: 'Gravação de voz não é suportada neste navegador' });
      return;
    }

    try {
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

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
        dispatch({ type: 'RECORDER_ERROR', error: 'Erro durante a gravação' });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      dispatch({ type: 'START' });
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          dispatch({ type: 'PERMISSION_DENIED' });
        } else if (err.name === 'NotFoundError') {
          dispatch({ type: 'DEVICE_ERROR', error: 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.' });
        } else {
          dispatch({ type: 'DEVICE_ERROR', error: `Erro no microfone: ${err.message}` });
        }
      } else {
        dispatch({ type: 'DEVICE_ERROR', error: 'Falha ao iniciar a gravação' });
      }
    }
  }, [isSupported, recState.status]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || recState.status !== 'recording') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (blob.size === 0) {
          dispatch({ type: 'NO_AUDIO' });
          resolve(null);
        } else {
          dispatch({ type: 'STOP', blob });
          resolve(blob);
        }
      };

      mediaRecorder.stop();
    });
  }, [recState.status]);

  const clearAudio = useCallback(() => {
    audioChunksRef.current = [];
    dispatch({ type: 'RESET' });
  }, []);

  const confirmAudio = useCallback((): Blob | null => {
    // Guard: only allow confirming from preview — prevents double-submit
    if (!recState.audioBlob || recState.status !== 'preview') return null;
    dispatch({ type: 'UPLOAD_START' });
    return recState.audioBlob;
  }, [recState.audioBlob, recState.status]);

  const reset = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    analyserRef.current = null;
    dataArrayRef.current = null;

    dispatch({ type: 'RESET' });
  }, []);

  return {
    state: recState.status,
    error: recState.error,
    startRecording,
    stopRecording,
    reset,
    isSupported,
    getAudioLevel,
    audioBlob: recState.audioBlob,
    clearAudio,
    confirmAudio,
  };
}
