import { DollarSign, Euro, PoundSterling, JapaneseYen, SwissFranc } from 'lucide-react';
import React from 'react';

const CURRENCY_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
    USD: DollarSign,
    EUR: Euro,
    GBP: PoundSterling,
    JPY: JapaneseYen,
    CHF: SwissFranc,
};

interface CashCurrencyIconProps {
    currency: string;
    className?: string;
    style?: React.CSSProperties;
}

export function CashCurrencyIcon({ currency, className, style }: CashCurrencyIconProps) {
    const IconComponent = CURRENCY_ICONS[currency];
    if (IconComponent) return <IconComponent className={className} style={style} />;

    // Fallback: text-based symbol for currencies without a lucide icon (e.g. BRL → R$)
    const symbols: Record<string, string> = { BRL: 'R$', ARS: '$', CLP: '$', COP: '$', MXN: '$', PEN: 'S/', CNY: '¥', KRW: '₩', INR: '₹', TRY: '₺' };
    const symbol = symbols[currency] || currency;

    return (
        <span
            className={className}
            style={{
                ...style,
                fontWeight: 700,
                fontSize: '0.75em',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {symbol}
        </span>
    );
}
