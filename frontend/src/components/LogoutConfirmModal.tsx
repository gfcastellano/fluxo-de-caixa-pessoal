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
      <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate/10 animate-scale-in overflow-hidden">
        {/* Header with warning icon */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-rose" />
          </div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm text-slate mt-2">{description}</p>
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
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
