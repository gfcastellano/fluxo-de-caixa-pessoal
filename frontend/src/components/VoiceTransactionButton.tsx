import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { VoiceConsentModal } from './VoiceConsentModal';
import { useVoice } from '../context/VoiceContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceTransaction } from '../services/voiceService';
import { getCategories } from '../services/categoryService';
import type { Transaction } from '../types';
import { cn } from '../utils/cn';

interface VoiceTransactionButtonProps {
  onTransactionCreated?: (transaction: Transaction) => void;
}

export function VoiceTransactionButton({
  onTransactionCreated,
}: VoiceTransactionButtonProps) {
  const { t, i18n } = useTranslation();
  const { state, error, startRecording, stopRecording, reset, isSupported } = useVoiceRecorder();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { hasConsent, showConsentModal, requestConsent, acceptConsent, declineConsent } = useVoice();

  const handleClick = useCallback(async () => {
    if (state === 'recording') {
      const audioBlob = await stopRecording();

      if (audioBlob) {
        const result = await sendVoiceTransaction(audioBlob, i18n.language);

        if (result.success && result.data) {
          setFeedback({
            type: 'success',
            message: result.message || t('voice.success'),
          });

          let transactionWithCategory = result.data;
          if (result.data.categoryId) {
            try {
              const categories = await getCategories(result.data.userId);
              const category = categories.find(c => c.id === result.data!.categoryId);
              if (category) {
                transactionWithCategory = { ...result.data, category };
              }
            } catch (error) {
              console.error('Error fetching category:', error);
            }
          }

          onTransactionCreated?.(transactionWithCategory);

          setTimeout(() => {
            setFeedback(null);
            reset();
          }, 3000);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || result.message || t('voice.error'),
          });

          setTimeout(() => {
            setFeedback(null);
            reset();
          }, 5000);
        }
      }
    } else if (state === 'idle' || state === 'error') {
      // Check consent before starting recording
      if (!hasConsent) {
        requestConsent();
        return;
      }
      setFeedback(null);
      await startRecording();
    }
  }, [state, stopRecording, startRecording, i18n.language, t, onTransactionCreated, reset]);

  if (!isSupported) return null;

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className="relative group">
      {/* Ripple Effects when recording */}
      {isRecording && (
        <>
          <div className="absolute inset-0 rounded-full bg-rose/30 animate-ping opacity-75" />
          <div className="absolute -inset-1 rounded-full bg-rose/20 animate-pulse" />
        </>
      )}

      <button
        onClick={handleClick}
        disabled={isProcessing || state === 'success'}
        className={cn(
          "relative flex items-center justify-center w-16 h-16 rounded-full shadow-float-button transition-all duration-300 z-10",
          "active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue/20",
          // State Styles
          state === 'idle' && "bg-gradient-to-br from-blue to-blue-hover text-white hover:scale-105",
          state === 'recording' && "bg-rose text-white scale-110",
          state === 'processing' && "bg-slate-light text-white cursor-wait",
          state === 'success' && "bg-emerald text-white",
          state === 'error' && "bg-rose text-white"
        )}
        aria-label={isRecording ? t('voice.stopRecording') : t('voice.addByVoice')}
      >
        {state === 'idle' && <Mic size={28} />}
        {state === 'recording' && <Square size={24} className="animate-pulse" />}
        {state === 'processing' && <Loader2 size={28} className="animate-spin" />}
        {state === 'success' && <Check size={28} />}
        {state === 'error' && <AlertCircle size={28} />}
      </button>

      {/* Floating Label / Feedback */}
      <div className={cn(
        "absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium shadow-glass backdrop-blur-md transition-all duration-300",
        feedback ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        feedback?.type === 'success' ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"
      )}>
        {feedback?.message}
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
