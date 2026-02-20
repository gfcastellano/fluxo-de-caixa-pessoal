import { useState } from 'react';
import { Check, Pencil, X, CalendarCheck } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/format';
import type { WeeklyReviewItem } from '../hooks/useWeeklyReview';

interface WeeklyReviewProps {
  items: WeeklyReviewItem[];
  onConfirm: (id: string) => void;
  onEditAmount: (id: string, amount: number) => void;
}

export function WeeklyReview({ items, onConfirm, onEditAmount }: WeeklyReviewProps) {
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const pending = items.filter((i) => !i.isConfirmed);
  const confirmed = items.filter((i) => i.isConfirmed);

  if (items.length === 0) return null;

  const handleConfirmTap = (id: string) => {
    if (pendingConfirm === id) {
      onConfirm(id);
      setPendingConfirm(null);
    } else {
      setPendingConfirm(id);
    }
  };

  const handleEditSave = (id: string) => {
    const parsed = parseFloat(editValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onEditAmount(id, parsed);
    }
    setEditingId(null);
    setEditValue('');
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const typeColor = (type: string) =>
    type === 'income' ? 'text-emerald' : 'text-rose';

  const typeSign = (type: string) => (type === 'income' ? '+' : '-');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <CalendarCheck size={15} className="text-blue" />
        <h2 className="text-sm font-semibold text-ink">Revisar esta semana</h2>
        {pending.length > 0 && (
          <span className="ml-auto text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
            {pending.length} pendente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {pending.map((item) => {
          const { transaction: tx } = item;
          const isAwaitingConfirm = pendingConfirm === tx.id;
          const isEditing = editingId === tx.id;

          return (
            <div
              key={tx.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/50 backdrop-blur border transition-all duration-200',
                isAwaitingConfirm ? 'border-emerald/40 bg-emerald/5' : 'border-white/60'
              )}
            >
              {/* Date */}
              <span className="text-[10px] text-slate/60 w-8 flex-shrink-0 tabular-nums">
                {formatDate(tx.date)}
              </span>

              {/* Description */}
              <span className="flex-1 text-sm text-ink truncate">{tx.description}</span>

              {/* Amount (editable) */}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(tx.id);
                      if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
                    }}
                    autoFocus
                    className="w-24 text-right text-sm rounded-lg border border-blue/30 bg-white/80 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleEditSave(tx.id)}
                    className="p-1 rounded-lg bg-blue/10 text-blue hover:bg-blue/20 transition-colors"
                    aria-label="Salvar valor"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditValue(''); }}
                    className="p-1 rounded-lg hover:bg-slate/10 text-slate transition-colors"
                    aria-label="Cancelar"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setEditingId(tx.id); setEditValue(tx.amount.toString()); setPendingConfirm(null); }}
                  className={cn('text-sm font-medium tabular-nums flex items-center gap-1 group', typeColor(tx.type))}
                  aria-label="Editar valor"
                >
                  {typeSign(tx.type)}{formatCurrency(tx.amount)}
                  <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}

              {/* Confirm button */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => { setPendingConfirm(null); handleConfirmTap(tx.id); }}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 flex-shrink-0',
                    isAwaitingConfirm
                      ? 'bg-emerald text-white shadow-sm'
                      : 'bg-white/60 text-slate hover:bg-emerald/10 hover:text-emerald border border-white/40'
                  )}
                  aria-label={isAwaitingConfirm ? 'Confirmar' : 'Confirmar ocorrência'}
                >
                  <Check size={12} />
                  {isAwaitingConfirm ? 'Confirmar?' : 'OK'}
                </button>
              )}
            </div>
          );
        })}

        {/* Confirmed items (collapsed summary) */}
        {confirmed.length > 0 && (
          <p className="text-[10px] text-slate/50 pl-1 pt-1">
            {confirmed.length} confirmada{confirmed.length > 1 ? 's' : ''} esta semana
          </p>
        )}
      </div>
    </div>
  );
}
