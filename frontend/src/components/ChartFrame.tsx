import { BarChart2 } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';

interface ChartFrameProps {
  /** Title shown above the chart */
  title?: string;
  /** Chart height in pixels (default: 180) */
  height?: number;
  /** When true, renders empty state instead of chart */
  isEmpty?: boolean;
  /** Message shown when isEmpty is true */
  emptyMessage?: string;
  /** Hint shown below the empty message */
  emptyHint?: string;
  className?: string;
  children: React.ReactElement;
}

/**
 * Standard wrapper for charts: title, empty state, and ResponsiveContainer.
 * Use this instead of inlining ResponsiveContainer + empty-state logic.
 *
 * Usage:
 *   <ChartFrame title="Composição" isEmpty={data.length === 0} height={200}>
 *     <BarChart data={data}>...</BarChart>
 *   </ChartFrame>
 */
export function ChartFrame({
  title,
  height = 180,
  isEmpty = false,
  emptyMessage = 'Sem dados ainda',
  emptyHint,
  className,
  children,
}: ChartFrameProps) {
  return (
    <div className={cn('border-t border-white/30 pt-4 mt-2', className)}>
      {title && (
        <h4 className="text-xs lg:text-sm font-medium text-ink mb-3">{title}</h4>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <BarChart2
            size={28}
            strokeWidth={1.5}
            className="text-slate/30"
          />
          <p className="text-sm text-slate">{emptyMessage}</p>
          {emptyHint && (
            <p className="text-xs text-slate/60">{emptyHint}</p>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
