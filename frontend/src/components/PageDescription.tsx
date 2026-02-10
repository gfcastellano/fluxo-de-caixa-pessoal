import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Portal } from './Portal';

interface PageDescriptionProps {
  pageKey: 'dashboard' | 'transactions' | 'categories' | 'budgets' | 'reports' | 'accounts';
  className?: string;
}

// Blue gradient colors for trust and clarity
const BLUE_COLORS = {
  // Primary blues - solid and trustworthy
  primary: '#3A86FF',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  // Gradient stops
  gradientStart: '#3A86FF',
  gradientEnd: '#1E40AF',
  // Base
  ink: '#0B1220',
  slate: '#5B667A',
  mist: '#F6F8FB',
  glass: 'rgba(255,255,255,0.55)',
};

export function PageDescription({ pageKey, className }: PageDescriptionProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const title = t(`pageDescriptions.${pageKey}.title`);
  const fullDescription = t(`pageDescriptions.${pageKey}.fullDescription`);
  const features = t(`pageDescriptions.${pageKey}.features`, { returnObjects: true }) as string[];
  const tooltipText = t('pageDescriptions.tooltip', 'Clique para saber mais sobre esta página');

  return (
    <>
      {/* Info Button - positioned next to title */}
      <div className="relative">
        <button
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          className={cn(
            'flex items-center justify-center',
            'w-7 h-7 sm:w-9 sm:h-9',
            'rounded-full',
            'bg-white/60 backdrop-blur-sm',
            'border border-white/80',
            'hover:bg-white/80',
            'active:scale-95',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'shadow-sm',
            className
          )}
          style={{ 
            color: BLUE_COLORS.primary,
            '--tw-ring-color': `${BLUE_COLORS.primary}4D` 
          } as React.CSSProperties}
          aria-label={t('pageDescriptions.showInfo', 'Mostrar informações da página')}
        >
          <Info className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div 
            className={cn(
              'absolute z-50',
              'top-1/2 -translate-y-1/2 right-full mr-2',
              'px-3 py-2',
              'rounded-lg',
              'text-xs font-medium',
              'whitespace-nowrap',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
            style={{
              backgroundColor: BLUE_COLORS.ink,
              color: 'white',
              boxShadow: `0 4px 12px ${BLUE_COLORS.ink}30`,
            }}
          >
            {tooltipText}
            {/* Tooltip Arrow */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 rotate-45"
              style={{ backgroundColor: BLUE_COLORS.ink }}
            />
          </div>
        )}
      </div>

      {/* Modal with features list */}
      <Portal>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <div
              className={cn(
                'fixed inset-0 z-40',
                'backdrop-blur-sm',
                'transition-opacity duration-300',
                'animate-in fade-in'
              )}
              style={{ backgroundColor: `${BLUE_COLORS.ink}4D` }}
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Content */}
            <div
              className={cn(
                'fixed z-50',
                'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-[calc(100%-1.5rem)] max-w-md max-h-[85vh]',
                'overflow-hidden',
                'flex flex-col',
                'animate-in zoom-in-95 fade-in duration-200'
              )}
              style={{
                backgroundColor: BLUE_COLORS.glass,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                boxShadow: `0 25px 50px -12px ${BLUE_COLORS.primary}40`,
                border: '1px solid rgba(255, 255, 255, 0.6)',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="page-description-title"
            >
              {/* Header with blue gradient */}
              <div 
                className="relative flex-shrink-0 px-4 py-3 sm:px-6 sm:py-5"
                style={{
                  background: `linear-gradient(135deg, ${BLUE_COLORS.gradientStart} 0%, ${BLUE_COLORS.gradientEnd} 100%)`,
                }}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    'absolute right-2.5 top-2.5 sm:right-4 sm:top-4',
                    'p-1 sm:p-1.5 rounded-full',
                    'bg-white/20 hover:bg-white/30',
                    'transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-white/50'
                  )}
                  aria-label={t('common.close', 'Fechar')}
                >
                  <X className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
                </button>

                <div className="flex items-center gap-2.5 sm:gap-3 pr-6 sm:pr-8">
                  <div 
                    className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Info className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h2
                    id="page-description-title"
                    className="text-sm sm:text-lg font-bold text-white leading-tight"
                  >
                    {title}
                  </h2>
                </div>
              </div>

              {/* Body - Scrollable */}
              <div 
                className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-5 space-y-3 sm:space-y-4"
                style={{ maxHeight: 'calc(85vh - 140px)' }}
              >
                {/* Full Description */}
                <p 
                  className="text-[11px] sm:text-sm leading-relaxed"
                  style={{ color: BLUE_COLORS.slate }}
                >
                  {fullDescription}
                </p>

                {/* Features List */}
                {Array.isArray(features) && features.length > 0 && (
                  <div className="space-y-2 sm:space-y-3">
                    <h3 
                      className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide"
                      style={{ color: BLUE_COLORS.ink }}
                    >
                      {t('pageDescriptions.whatYouCanDo')}
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2">
                      {features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 sm:gap-3 text-[11px] sm:text-sm"
                          style={{ color: BLUE_COLORS.ink }}
                        >
                          <span 
                            className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-medium"
                            style={{ 
                              backgroundColor: `${BLUE_COLORS.primary}1A`,
                              color: BLUE_COLORS.primary 
                            }}
                          >
                            {index + 1}
                          </span>
                          <span className="leading-relaxed pt-0.5">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div 
                className="flex-shrink-0 px-4 py-2.5 sm:px-6 sm:py-4 border-t"
                style={{ 
                  backgroundColor: 'rgba(246, 248, 251, 0.5)',
                  borderColor: 'rgba(255, 255, 255, 0.6)'
                }}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    'w-full py-2 sm:py-2.5 px-4',
                    'font-medium text-xs sm:text-sm',
                    'rounded-lg sm:rounded-xl',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2',
                    'hover:opacity-90 active:scale-[0.98]'
                  )}
                  style={{ 
                    background: `linear-gradient(135deg, ${BLUE_COLORS.gradientStart} 0%, ${BLUE_COLORS.gradientEnd} 100%)`,
                    color: 'white',
                    boxShadow: `0 4px 14px ${BLUE_COLORS.primary}40`,
                  }}
                >
                  {t('common.close', 'Fechar')}
                </button>
              </div>
            </div>
          </>
        )}
      </Portal>
    </>
  );
}
