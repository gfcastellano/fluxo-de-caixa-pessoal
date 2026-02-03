import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceTransaction } from '../services/voiceService';
import { getCategories } from '../services/categoryService';
import type { Transaction, Category } from '../types';

interface VoiceTransactionButtonProps {
  onTransactionCreated?: (transaction: Transaction) => void;
}

export function VoiceTransactionButton({
  onTransactionCreated,
}: VoiceTransactionButtonProps) {
  const { t, i18n } = useTranslation();
  const { state, error, startRecording, stopRecording, reset, isSupported } = useVoiceRecorder();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'recording') {
      // Stop recording
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        // Send to backend with current language
        const result = await sendVoiceTransaction(audioBlob, i18n.language);
        
        if (result.success && result.data) {
          setFeedback({
            type: 'success',
            message: result.message || t('voice.success'),
          });
          
          // Fetch the full category data if categoryId exists
          let transactionWithCategory = result.data;
          if (result.data.categoryId) {
            try {
              const categories = await getCategories(result.data.userId);
              const category = categories.find(c => c.id === result.data!.categoryId);
              if (category) {
                transactionWithCategory = {
                  ...result.data,
                  category
                };
              }
            } catch (error) {
              console.error('Error fetching category:', error);
            }
          }
          
          onTransactionCreated?.(transactionWithCategory);
          
          // Clear success feedback after 3 seconds
          setTimeout(() => {
            setFeedback(null);
            reset();
          }, 3000);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || result.message || t('voice.error'),
          });
          
          // Clear error feedback after 5 seconds
          setTimeout(() => {
            setFeedback(null);
            reset();
          }, 5000);
        }
      }
    } else if (state === 'idle' || state === 'error') {
      // Start recording
      setFeedback(null);
      await startRecording();
    }
  }, [state, stopRecording, startRecording, i18n.language, t, onTransactionCreated, reset]);

  // Get button appearance based on state
  const getButtonContent = () => {
    switch (state) {
      case 'recording':
        return (
          <>
            <Square className="h-5 w-5 animate-pulse" />
            <span>{t('voice.stopRecording')}</span>
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('voice.processing')}</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-5 w-5" />
            <span>{t('voice.success')}</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-5 w-5" />
            <span>{t('voice.error')}</span>
          </>
        );
      default:
        return (
          <>
            <Mic className="h-5 w-5" />
            <span>{t('voice.addByVoice')}</span>
          </>
        );
    }
  };

  const getButtonVariant = (): 'primary' | 'secondary' | 'danger' | 'ghost' => {
    switch (state) {
      case 'recording':
        return 'danger';
      case 'processing':
        return 'secondary';
      case 'success':
        return 'primary';
      case 'error':
        return 'danger';
      default:
        return 'ghost';
    }
  };

  if (!isSupported) {
    return null; // Don't show button if voice recording is not supported
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleClick}
        disabled={state === 'processing' || state === 'success'}
        variant={getButtonVariant()}
        className={`flex items-center gap-2 transition-all duration-200 ${
          state === 'recording' ? 'ring-4 ring-red-200 animate-pulse' : ''
        }`}
        aria-label={state === 'recording' ? t('voice.stopRecording') : t('voice.addByVoice')}
      >
        {getButtonContent()}
      </Button>
      
      {/* Feedback message */}
      {feedback && (
        <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {feedback.message}
        </p>
      )}
      
      {/* Recording hint */}
      {state === 'recording' && (
        <p className="text-sm text-gray-500 animate-pulse">
          {t('voice.recordingHint')}
        </p>
      )}
      
      {/* Permission error */}
      {error && state === 'error' && !feedback && (
        <p className="text-sm text-red-600 max-w-xs text-center">
          {error.includes('permission') ? t('voice.permissionDenied') : error}
        </p>
      )}
    </div>
  );
}
