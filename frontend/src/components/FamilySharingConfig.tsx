import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SharingPermissions } from '../types/family';
import { DEFAULT_SHARING_PERMISSIONS } from '../types/family';

interface FamilySharingConfigProps {
    permissions: SharingPermissions;
    onChange: (permissions: SharingPermissions) => void;
    readOnly?: boolean;
}

export function FamilySharingConfig({ permissions, onChange, readOnly = false }: FamilySharingConfigProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpanded(expanded === section ? null : section);
    };

    const updatePermission = (path: string, value: boolean) => {
        if (readOnly) return;
        const parts = path.split('.');
        const newPerms = JSON.parse(JSON.stringify(permissions)) as Record<string, Record<string, unknown>>;
        if (parts.length === 2) {
            newPerms[parts[0]][parts[1]] = value;
        }
        onChange(newPerms as unknown as SharingPermissions);
    };

    const handlePreset = (preset: 'all' | 'balances' | 'none') => {
        if (readOnly) return;
        if (preset === 'all') {
            onChange({
                accounts: { shareAll: true, showBalance: true, showTransactions: true },
                creditCards: { shareAll: true, showLimit: true, showAvailable: true, showBillTotal: true, showTransactions: true },
                categories: { shareAll: true },
                budgets: { shareAll: true, showSpent: true, showRemaining: true },
                reports: { shareOverview: true, shareCategoryBreakdown: true, shareTrends: true },
            });
        } else if (preset === 'balances') {
            onChange(DEFAULT_SHARING_PERMISSIONS);
        } else {
            onChange({
                accounts: { shareAll: false, showBalance: false, showTransactions: false },
                creditCards: { shareAll: false, showLimit: false, showAvailable: false, showBillTotal: false, showTransactions: false },
                categories: { shareAll: false },
                budgets: { shareAll: false, showSpent: false, showRemaining: false },
                reports: { shareOverview: false, shareCategoryBreakdown: false, shareTrends: false },
            });
        }
    };

    const Checkbox = ({ label, checked, path }: { label: string; checked: boolean; path: string }) => (
        <label className="flex items-center gap-2 py-1 cursor-pointer group">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => updatePermission(path, e.target.checked)}
                disabled={readOnly}
                className="w-4 h-4 rounded border-slate/30 text-blue focus:ring-blue/20 disabled:opacity-50"
            />
            <span className="text-sm text-ink group-hover:text-blue transition-colors">{label}</span>
        </label>
    );

    const sections = [
        {
            key: 'accounts',
            icon: '🏦',
            title: t('settings.family.sharing.accounts', 'Accounts'),
            items: [
                { label: t('settings.family.sharing.shareAll', 'Share all'), path: 'accounts.shareAll', checked: permissions.accounts.shareAll },
                { label: t('settings.family.sharing.showBalance', 'Show balance'), path: 'accounts.showBalance', checked: permissions.accounts.showBalance },
                { label: t('settings.family.sharing.showTransactions', 'Show transactions'), path: 'accounts.showTransactions', checked: permissions.accounts.showTransactions },
            ],
        },
        {
            key: 'creditCards',
            icon: '💳',
            title: t('settings.family.sharing.creditCards', 'Credit Cards'),
            items: [
                { label: t('settings.family.sharing.shareAll', 'Share all'), path: 'creditCards.shareAll', checked: permissions.creditCards.shareAll },
                { label: t('settings.family.sharing.showLimit', 'Show limit'), path: 'creditCards.showLimit', checked: permissions.creditCards.showLimit },
                { label: t('settings.family.sharing.showAvailable', 'Show available'), path: 'creditCards.showAvailable', checked: permissions.creditCards.showAvailable },
                { label: t('settings.family.sharing.showBillTotal', 'Show bill total'), path: 'creditCards.showBillTotal', checked: permissions.creditCards.showBillTotal },
                { label: t('settings.family.sharing.showTransactions', 'Show transactions'), path: 'creditCards.showTransactions', checked: permissions.creditCards.showTransactions },
            ],
        },
        {
            key: 'budgets',
            icon: '📊',
            title: t('settings.family.sharing.budgets', 'Budgets'),
            items: [
                { label: t('settings.family.sharing.shareAll', 'Share all'), path: 'budgets.shareAll', checked: permissions.budgets.shareAll },
                { label: t('settings.family.sharing.showSpent', 'Show spent'), path: 'budgets.showSpent', checked: permissions.budgets.showSpent },
                { label: t('settings.family.sharing.showRemaining', 'Show remaining'), path: 'budgets.showRemaining', checked: permissions.budgets.showRemaining },
            ],
        },
        {
            key: 'reports',
            icon: '📈',
            title: t('settings.family.sharing.reports', 'Reports'),
            items: [
                { label: t('settings.family.sharing.shareOverview', 'Share overview'), path: 'reports.shareOverview', checked: permissions.reports.shareOverview },
                { label: t('settings.family.sharing.shareCategoryBreakdown', 'Category breakdown'), path: 'reports.shareCategoryBreakdown', checked: permissions.reports.shareCategoryBreakdown },
                { label: t('settings.family.sharing.shareTrends', 'Trends'), path: 'reports.shareTrends', checked: permissions.reports.shareTrends },
            ],
        },
    ];

    return (
        <div className="space-y-3">
            {/* Presets */}
            {!readOnly && (
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => handlePreset('all')}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-emerald/10 text-emerald hover:bg-emerald/20 transition-colors"
                    >
                        {t('settings.family.sharing.presetAll', '✅ Share Everything')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePreset('balances')}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-blue/10 text-blue hover:bg-blue/20 transition-colors"
                    >
                        {t('settings.family.sharing.presetBalances', '💰 Balances Only')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePreset('none')}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-rose/10 text-rose hover:bg-rose/20 transition-colors"
                    >
                        {t('settings.family.sharing.presetNone', '🔒 Share Nothing')}
                    </button>
                </div>
            )}

            {/* Permission sections */}
            <div className="space-y-1">
                {sections.map((section) => (
                    <div key={section.key} className="border border-slate/10 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggleSection(section.key)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white/50 hover:bg-white/80 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-base">{section.icon}</span>
                                <span className="text-sm font-medium text-ink">{section.title}</span>
                            </div>
                            <span className="text-xs text-slate">
                                {section.items.filter(i => i.checked).length}/{section.items.length}
                            </span>
                        </button>
                        {expanded === section.key && (
                            <div className="px-3 py-2 bg-white/30 border-t border-slate/5 space-y-0.5">
                                {section.items.map((item) => (
                                    <Checkbox key={item.path} {...item} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
