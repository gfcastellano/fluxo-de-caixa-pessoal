import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Tags, Landmark, PiggyBank, BarChart3 } from 'lucide-react';
import { VoiceHeroButton } from './VoiceHeroButton';
import { useVoice } from '../context/VoiceContext';
import { cn } from '../utils/cn';

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    voiceEnabled: boolean;
}

// Navigation items - grouped:
// [Painel] | [Transações, Categorias, Contas, Orçamentos] + VoiceHero | [Relatórios]
const dashboardItem: NavItem = { name: 'Painel', href: '/', icon: LayoutDashboard, voiceEnabled: true };

const middleItems: NavItem[] = [
    { name: 'Transações', href: '/transactions', icon: ArrowLeftRight, voiceEnabled: true },
    { name: 'Categorias', href: '/categories', icon: Tags, voiceEnabled: true },
    { name: 'Contas', href: '/accounts', icon: Landmark, voiceEnabled: true },
    { name: 'Orçamentos', href: '/budgets', icon: PiggyBank, voiceEnabled: true },
];

const reportsItem: NavItem = { name: 'Relatórios', href: '/reports', icon: BarChart3, voiceEnabled: false };

// Green separator bar component
function Separator() {
    return <div className="w-0.5 h-8 bg-teal rounded-full mx-1" />;
}

export function VoiceDock() {
    const location = useLocation();
    const { isVoiceEnabled } = useVoice();

    const renderNavItem = (item: NavItem) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;

        // Dynamic icon size based on viewport width
        // clamp(16px, 5vw, 20px)
        const iconSize = `clamp(16px, 5vw, 20px)`;

        return (
            <Link
                key={item.href}
                to={item.href}
                className={cn(
                    "relative flex flex-col items-center justify-center p-1 sm:p-2 rounded-2xl transition-all duration-200 group flex-1",
                    // Removed min-w-[44px] to allow shrinking on tiny screens
                    isActive
                        ? "bg-teal/10 text-teal"
                        : "text-slate hover:bg-white/50 hover:text-ink"
                )}
            >
                {/* Active Indicator Pill - Scale width with viewport */}
                {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 bg-teal rounded-full"
                        style={{ width: 'clamp(12px, 4vw, 20px)' }} />
                )}

                {/* Icon wrapper to enforce fluid size */}
                <div style={{ width: iconSize, height: iconSize }}>
                    <Icon
                        size={100} // Set to 100% of wrapper
                        strokeWidth={isActive ? 2.5 : 2}
                        className="w-full h-full transition-transform group-active:scale-95"
                    />
                </div>

                <span className={cn(
                    "mt-0.5 font-medium transition-all whitespace-nowrap overflow-hidden text-ellipsis w-full text-center",
                    isActive ? "opacity-100" : "opacity-70"
                )} style={{ fontSize: 'clamp(0.5rem, 2vw, 0.65rem)' }}>
                    {item.name}
                </span>
            </Link>
        );
    };

    return (
        <div className="sm:hidden fixed bottom-1 left-1 right-1 z-docked pointer-events-none flex justify-center pb-safe">
            {/* Dock Container - Fluid Width */}
            <nav className="pointer-events-auto w-full max-w-[450px] flex items-center justify-between px-1 py-1.5 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/50 shadow-glass-hover transition-all duration-300">

                {/* Painel (Dashboard) */}
                {renderNavItem(dashboardItem)}

                {/* Separator - Fluid height/margin */}
                <div className="w-[1px] bg-slate/10 rounded-full mx-0.5" style={{ height: 'clamp(16px, 4vh, 24px)' }} />

                {/* First half of middle items (before Hero) */}
                {middleItems.slice(0, 2).map(renderNavItem)}

                {/* Central Voice Hero - Floating above the dock */}
                {isVoiceEnabled && (
                    <div className="-mt-12 mx-1 flex-shrink-0 z-50">
                        <VoiceHeroButton />
                    </div>
                )}

                {/* Second half of middle items (after Hero) */}
                {middleItems.slice(2).map(renderNavItem)}

                {/* Separator */}
                <div className="w-[1px] bg-slate/10 rounded-full mx-0.5" style={{ height: 'clamp(16px, 4vh, 24px)' }} />

                {/* Relatórios (Reports) */}
                {renderNavItem(reportsItem)}
            </nav>
        </div>
    );
}
