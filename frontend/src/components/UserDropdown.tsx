import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { Settings, LogOut, User } from 'lucide-react';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function UserDropdown() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  const handleSettings = () => {
    navigate('/settings');
    setIsOpen(false);
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || t('nav.user', 'Usuário');
  const photoURL = user?.photoURL;
  const email = user?.email || '';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 p-1 pr-3 rounded-full transition-all duration-200",
          "hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue/30",
          isOpen && "bg-white/50 ring-2 ring-blue/30"
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="relative">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover border border-white/50"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue/20 to-indigo/20 flex items-center justify-center border border-white/50">
              <User className="w-4 h-4 text-blue" />
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald rounded-full border-2 border-white" />
        </div>

        {/* Name (hidden on smallest screens) */}
        <span className="hidden sm:block text-sm font-medium text-ink max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron */}
        <svg
          className={cn(
            "w-4 h-4 text-slate transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          "absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate/10",
          "transform origin-top-right transition-all duration-200 z-dropdown",
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
      >
        {/* User Info Header */}
        <div className="px-4 py-3 border-b border-slate/10">
          <div className="flex items-center gap-3">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-slate/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue/20 to-indigo/20 flex items-center justify-center">
                <User className="w-5 h-5 text-blue" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
              <p className="text-xs text-slate truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          <button
            onClick={handleSettings}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
              "text-ink hover:bg-mist transition-colors duration-150",
              "focus:outline-none focus:bg-mist"
            )}
          >
            <Settings className="w-4 h-4 text-slate" />
            <span>{t('nav.settings', 'Configurações')}</span>
          </button>

          <div className="my-1 border-t border-slate/10" />

          <button
            onClick={handleLogoutClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
              "text-rose hover:bg-rose/5 transition-colors duration-150",
              "focus:outline-none focus:bg-rose/5"
            )}
          >
            <LogOut className="w-4 h-4" />
            <span>{t('nav.logout', 'Sair')}</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title={t('logoutConfirm.title', 'Deseja realmente sair?')}
        description={t('logoutConfirm.description', 'Você precisará fazer login novamente para acessar seus dados.')}
        cancelLabel={t('common.cancel', 'Cancelar')}
        confirmLabel={t('nav.logout', 'Sair')}
      />
    </div>
  );
}
