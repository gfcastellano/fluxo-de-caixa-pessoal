import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { cn } from '../utils/cn';
import { VoiceDock } from './VoiceDock';
import { VoiceHeroButton } from './VoiceHeroButton';
import { UserDropdown } from './UserDropdown';
import { LayoutDashboard, ArrowLeftRight, Tags, Landmark, PiggyBank, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useScrollDirection } from '../hooks/useScrollDirection';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  voiceEnabled: boolean;
}

// Navigation items (without settings - moved to user dropdown)
const navItems: NavItem[] = [
  { name: 'nav.dashboard', href: '/', icon: LayoutDashboard, voiceEnabled: true },
  { name: 'nav.transactions', href: '/transactions', icon: ArrowLeftRight, voiceEnabled: true },
  { name: 'nav.categories', href: '/categories', icon: Tags, voiceEnabled: true },
  { name: 'nav.accounts', href: '/accounts', icon: Landmark, voiceEnabled: true },
  { name: 'nav.budgets', href: '/budgets', icon: PiggyBank, voiceEnabled: true },
  { name: 'nav.reports', href: '/reports', icon: BarChart3, voiceEnabled: false },
];

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { isVoiceEnabled } = useVoice();
  const location = useLocation();
  const { t } = useTranslation();
  const scrollDirection = useScrollDirection();
  const isHeaderVisible = scrollDirection === 'up';

  // Render nav item for sidebar (tablet)
  const renderSidebarNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "relative flex items-center gap-3 px-4 py-3 rounded-xl mx-2 transition-all duration-200 group",
          isActive
            ? "bg-blue/10 text-blue font-medium"
            : "text-slate hover:bg-white/50 hover:text-ink"
        )}
      >
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue rounded-r-full" />
        )}

        <Icon
          size={20}
          strokeWidth={isActive ? 2.5 : 2}
          className="transition-transform group-active:scale-95 flex-shrink-0"
        />

        <span className={cn(
          "text-sm transition-all whitespace-nowrap",
          isActive ? "opacity-100" : "opacity-80"
        )}>
          {t(item.name)}
        </span>
      </Link>
    );
  };

  // Render nav item for top bar (desktop)
  const renderTopNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-blue/10 text-blue"
            : "text-slate hover:bg-white/50 hover:text-ink"
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        <span>{t(item.name)}</span>

        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(50%+0.5rem)] w-8 h-1 bg-blue rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-mist text-ink font-sans">
      {/* ============================================
          MOBILE HEADER (sm-)
          ============================================ */}
      <header
        className={cn(
          "sm:hidden sticky top-0 z-sticky bg-mist/80 backdrop-blur-lg px-3 py-2.5 flex justify-between items-center border-b border-white/30 transition-transform duration-300 ease-in-out",
          !isHeaderVisible && "-translate-y-full"
        )}
        style={{ height: 'var(--header-height)' }}
      >
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-ink tracking-tight">Assist</h1>
        </div>

        {/* Profile / Actions */}
        <div className="flex items-center gap-2">
          <UserDropdown />
        </div>
      </header>

      {/* ============================================
          TABLET SIDEBAR (sm to lg)
          ============================================ */}
      <aside className="hidden sm:flex lg:hidden flex-col fixed left-0 top-0 h-full w-56 bg-white/70 backdrop-blur-xl border-r border-white/40 shadow-glass z-sticky animate-slide-in-left">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-white/30">
          <h1 className="text-lg font-bold text-ink tracking-tight">Assist</h1>
          <p className="text-xs text-slate mt-0.5">{t('app.subtitle', 'Fluxo de Caixa Pessoal')}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map(renderSidebarNavItem)}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-white/30">
          <UserDropdown />
        </div>
      </aside>

      {/* ============================================
          DESKTOP TOP NAVIGATION (lg+)
          ============================================ */}
      <header className="hidden lg:block sticky top-0 z-sticky bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-glass">
        <div className="max-w-7xl mx-auto px-6 xl:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-ink tracking-tight">Assist</h1>
              </Link>

              {/* Navigation Links */}
              <nav className="flex items-center gap-1">
                {navItems.map(renderTopNavItem)}
              </nav>
            </div>

            {/* Right Side: Voice Hero + User */}
            <div className="flex items-center gap-4">
              {/* Voice Hero Button - Desktop Only - Far Right */}
              {isVoiceEnabled && (
                <div className="mr-2">
                  <VoiceHeroButton />
                </div>
              )}

              {/* User Dropdown */}
              <div className="pl-4 border-l border-slate/10">
                <UserDropdown />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          TABLET FLOATING HERO BUTTON (sm to lg)
          ============================================ */}
      {isVoiceEnabled && (
        <div className="hidden sm:block lg:hidden fixed top-6 right-6 z-[100]">
          <VoiceHeroButton />
        </div>
      )}

      {/* ============================================
          MAIN CONTENT AREA
          ============================================ */}
      <main className={cn(
        "pb-24", // Mobile: ensure content clears the bottom dock
        "sm:pb-8 sm:pl-56", // Tablet: sidebar offset and normal padding
        "lg:pl-0" // Desktop: no sidebar offset
      )}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 animate-fade-in h-full">
          {children}
        </div>
      </main>

      {/* ============================================
          MOBILE BOTTOM DOCK (sm-)
          ============================================ */}
      <VoiceDock />
    </div>
  );
}
