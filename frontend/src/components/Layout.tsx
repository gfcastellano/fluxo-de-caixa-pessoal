import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import {
  LayoutDashboard,
  Wallet,
  Tags,
  PiggyBank,
  BarChart3,
  Landmark,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.transactions'), href: '/transactions', icon: Wallet },
    { name: t('nav.categories'), href: '/categories', icon: Tags },
    { name: t('nav.budgets'), href: '/budgets', icon: PiggyBank },
    { name: t('nav.accounts'), href: '/accounts', icon: Landmark },
    { name: t('nav.reports'), href: '/reports', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-primary-600">
            Fluxo de Caixa
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-white border-r border-neutral-200',
          'lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="mb-8 px-3">
            <h1 className="text-2xl font-bold text-primary-600">
              Fluxo de Caixa
            </h1>
            <p className="text-sm text-neutral-500">Pessoal</p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  <Icon className={cn(
                    'mr-3 h-5 w-5 transition-colors',
                    isActive ? 'text-primary-600' : 'text-neutral-400'
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 bg-white">
            <div className="flex items-center mb-3 px-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.displayName || user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
