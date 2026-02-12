import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { User, Users } from 'lucide-react';
import { cn } from '../utils/cn';

export function FamilyToggle() {
    const { activeFamily, viewMode, toggleViewMode, sharedDataLoading } = useFamily();
    const { t } = useTranslation();

    // Only show when user has a family
    if (!activeFamily) return null;

    return (
        <button
            onClick={toggleViewMode}
            className={cn(
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border",
                "hover:shadow-md active:scale-95",
                viewMode === 'family'
                    ? "bg-violet-500/10 text-violet-700 border-violet-200 shadow-sm"
                    : "bg-white/50 text-slate-500 border-white/60 hover:bg-white/80"
            )}
            title={viewMode === 'family' ? t('family.toggle.family') : t('family.toggle.personal')}
        >
            {viewMode === 'family' ? (
                <>
                    <Users size={14} className="text-violet-600" />
                    <span className="hidden sm:inline">{t('family.toggle.family')}</span>
                    {sharedDataLoading && (
                        <div className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                    )}
                </>
            ) : (
                <>
                    <User size={14} />
                    <span className="hidden sm:inline">{t('family.toggle.personal')}</span>
                </>
            )}
        </button>
    );
}
