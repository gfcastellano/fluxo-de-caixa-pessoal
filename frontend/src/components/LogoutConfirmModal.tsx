import { X, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { Portal } from './Portal';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  cancelLabel,
  confirmLabel,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-[calc(100%-1.5rem)] sm:w-full max-w-sm bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate/10 animate-scale-in overflow-hidden">
        {/* Header with warning icon */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 text-center">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose/10 flex items-center justify-center mb-3 sm:mb-4">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-ink">{title}</h2>
          <p className="text-xs sm:text-sm text-slate mt-1 sm:mt-2">{description}</p>
        </div>

        {/* Action buttons */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onConfirm}
            className="flex-1 rounded-xl border-rose/30 text-rose hover:bg-rose/5 hover:border-rose/50"
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
      </div>
    </Portal>
  );
}
