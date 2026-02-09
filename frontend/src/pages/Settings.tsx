import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { hasVoiceConsent, saveVoiceConsent } from '../components/VoiceConsentModal';
import { getVoiceConsent } from '../services/voiceService';
import { Mic, Shield, FileText, ExternalLink, CheckCircle, XCircle, LogOut, Trash2, Globe, User, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { LogoutConfirmModal } from '../components/LogoutConfirmModal';

// Language options
const languages = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function Settings() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Load voice consent status
  useEffect(() => {
    const loadConsentStatus = async () => {
      if (!user) {
        setHasConsent(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // First check localStorage for immediate response
        const localConsent = hasVoiceConsent();

        // Then fetch from server
        const result = await getVoiceConsent();

        if (result.success && result.data) {
          setHasConsent(result.data.voiceConsent === true);
        } else {
          // If server request fails, fall back to localStorage
          setHasConsent(localConsent);
        }
      } catch (error) {
        console.error('Error loading voice consent status:', error);
        // Fall back to localStorage on error
        setHasConsent(hasVoiceConsent());
      } finally {
        setIsLoading(false);
      }
    };

    loadConsentStatus();
  }, [user]);

  // Handle language change
  const handleLanguageChange = async (langCode: string) => {
    try {
      await i18n.changeLanguage(langCode);
      setCurrentLanguage(langCode);

      // Save to user settings in Firestore
      if (user) {
        const { db } = await import('../firebase/config');
        const { doc, setDoc, getDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          await setDoc(userRef, {
            ...userData,
            settings: {
              ...userData.settings,
              language: langCode,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Handle revoking voice consent
  const handleRevokeConsent = async () => {
    try {
      await saveVoiceConsent(false);
      setHasConsent(false);
      setShowRevokeConfirm(false);
    } catch (error) {
      console.error('Error revoking voice consent:', error);
    }
  };

  // Handle granting voice consent
  const handleGrantConsent = async () => {
    try {
      await saveVoiceConsent(true);
      setHasConsent(true);
    } catch (error) {
      console.error('Error granting voice consent:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Handle delete all user data
  const handleDeleteAllData = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // Delete all transactions
      const transactionsRef = collection(db, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      transactionsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.userId === user.uid) {
          batch.delete(docSnapshot.ref);
        }
      });

      // Delete all accounts
      const accountsRef = collection(db, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);
      accountsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.userId === user.uid) {
          batch.delete(docSnapshot.ref);
        }
      });

      // Delete all categories
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesRef);
      categoriesSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.userId === user.uid) {
          batch.delete(docSnapshot.ref);
        }
      });

      // Delete all budgets
      const budgetsRef = collection(db, 'budgets');
      const budgetsSnapshot = await getDocs(budgetsRef);
      budgetsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.userId === user.uid) {
          batch.delete(docSnapshot.ref);
        }
      });

      // Delete user document
      const userRef = doc(db, 'users', user.uid);
      batch.delete(userRef);

      // Commit all deletions
      await batch.commit();

      // Logout after deletion
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error deleting user data:', error);
      alert(t('settings.account.deleteError', 'Erro ao deletar dados. Tente novamente.'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Account Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue/10 text-blue">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{t('settings.account.title', 'Conta')}</CardTitle>
                    <CardDescription>{t('settings.account.description', 'Gerencie sua conta e dados')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-4 p-4 bg-mist rounded-xl">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-12 h-12 rounded-full object-cover border border-slate/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue/20 to-indigo/20 flex items-center justify-center border border-slate/10">
                      <User className="w-6 h-6 text-blue" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink">{user?.displayName || user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-slate truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="danger"
                  leftIcon={<LogOut className="h-4 w-4" />}
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full sm:w-auto"
                >
                  {t('nav.logout', 'Sair')}
                </Button>
              </CardContent>
            </Card>

            {/* Preferences Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo/10 text-indigo">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{t('settings.preferences.title', 'Preferências')}</CardTitle>
                    <CardDescription>{t('settings.preferences.description', 'Personalize sua experiência no aplicativo')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-ink mb-3">{t('settings.preferences.language', 'Idioma')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                            currentLanguage === lang.code
                              ? "border-blue bg-blue/5 text-blue"
                              : "border-slate/20 hover:border-slate/40 hover:bg-mist"
                          )}
                        >
                          <span className="text-2xl">{lang.flag}</span>
                          <div>
                            <p className="font-medium text-sm">{lang.name}</p>
                            <p className="text-xs text-slate">{lang.code.toUpperCase()}</p>
                          </div>
                          {currentLanguage === lang.code && (
                            <CheckCircle className="h-4 w-4 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Privacy & Voice Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue/10 text-blue">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{t('settings.privacy.title', 'Privacidade e Dados')}</CardTitle>
                    <CardDescription>{t('settings.privacy.description', 'Gerencie suas configurações de privacidade e consentimentos')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voice Consent Status */}
                <div className="flex items-start justify-between p-4 bg-mist rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
                      hasConsent ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"
                    )}>
                      <Mic className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-ink">{t('settings.voice.title', 'Consentimento de Voz')}</h3>
                      <p className="text-sm text-slate mt-1">
                        {isLoading
                          ? t('settings.voice.loading', 'Carregando status...')
                          : hasConsent
                            ? t('settings.voice.granted', 'Você concedeu permissão para usar o recurso de voz. Seus áudios são processados pela OpenAI para transcrição.')
                            : t('settings.voice.revoked', 'Você não concedeu permissão para usar o recurso de voz. O recurso de adição por voz não está disponível.')
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate/30 border-t-blue rounded-full animate-spin" />
                    ) : hasConsent ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald">
                        <CheckCircle className="h-4 w-4" />
                        {t('settings.voice.statusGranted', 'Ativo')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-rose">
                        <XCircle className="h-4 w-4" />
                        {t('settings.voice.statusRevoked', 'Inativo')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Voice Consent Actions */}
                {!isLoading && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {hasConsent ? (
                      <>
                        {showRevokeConfirm ? (
                          <div className="flex flex-col sm:flex-row gap-3 w-full p-4 bg-rose/5 border border-rose/20 rounded-xl">
                            <div className="flex-1">
                              <p className="text-sm text-rose font-medium">
                                {t('settings.voice.revokeConfirmTitle', 'Tem certeza que deseja revogar?')}
                              </p>
                              <p className="text-xs text-slate mt-1">
                                {t('settings.voice.revokeConfirmDescription', 'Você não poderá mais usar o recurso de adição por voz.')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowRevokeConfirm(false)}
                              >
                                {t('common.cancel', 'Cancelar')}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={handleRevokeConsent}
                              >
                                {t('settings.voice.revoke', 'Revogar')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            leftIcon={<XCircle className="h-4 w-4" />}
                            onClick={() => setShowRevokeConfirm(true)}
                          >
                            {t('settings.voice.revokeConsent', 'Revogar Consentimento de Voz')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        leftIcon={<Mic className="h-4 w-4" />}
                        onClick={handleGrantConsent}
                      >
                        {t('settings.voice.grantConsent', 'Conceder Consentimento de Voz')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legal Documents Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate/10 text-slate">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{t('settings.legal.title', 'Documentos Legais')}</CardTitle>
                    <CardDescription>{t('settings.legal.description', 'Leia nossos termos e políticas de privacidade')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl transition-all duration-200",
                      "bg-mist hover:bg-white/50 border border-transparent hover:border-slate/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-slate" />
                      <div>
                        <h3 className="font-medium text-ink">{t('settings.legal.privacyPolicy', 'Política de Privacidade')}</h3>
                        <p className="text-sm text-slate">{t('settings.legal.privacyPolicyDescription', 'Como coletamos, usamos e protegemos seus dados')}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate" />
                  </a>

                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl transition-all duration-200",
                      "bg-mist hover:bg-white/50 border border-transparent hover:border-slate/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate" />
                      <div>
                        <h3 className="font-medium text-ink">{t('settings.legal.termsOfService', 'Termos de Uso')}</h3>
                        <p className="text-sm text-slate">{t('settings.legal.termsOfServiceDescription', 'Regras e condições para uso do aplicativo')}</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Danger Zone - At the bottom, full width */}
        <Card className="border-rose/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose/10 text-rose">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-rose">{t('settings.account.dangerZone', 'Zona de Perigo')}</CardTitle>
                <CardDescription>{t('settings.account.dangerZoneDescription', 'Ações irreversíveis que afetam sua conta')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showDeleteConfirm ? (
              <div className="flex flex-col gap-3 p-4 bg-rose/5 border border-rose/20 rounded-xl">
                <div>
                  <p className="text-sm text-rose font-medium">
                    {t('settings.account.deleteConfirmTitle', 'Tem certeza que deseja deletar todos os seus dados?')}
                  </p>
                  <p className="text-xs text-slate mt-1">
                    {t('settings.account.deleteConfirmDescription', 'Esta ação não pode ser desfeita. Todas as suas transações, contas, categorias e orçamentos serão permanentemente excluídos.')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t('common.cancel', 'Cancelar')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={handleDeleteAllData}
                    isLoading={isDeleting}
                  >
                    {t('settings.account.deleteAllData', 'Deletar Todos os Dados')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-rose/5 rounded-xl">
                <div>
                  <h3 className="text-sm font-medium text-ink">{t('settings.account.deleteAllData', 'Deletar Todos os Dados')}</h3>
                  <p className="text-xs text-slate mt-1">
                    {t('settings.account.deleteAllDataDescription', 'Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-rose/30 text-rose hover:bg-rose/5 flex-shrink-0"
                >
                  {t('settings.account.deleteAllData', 'Deletar Todos os Dados')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.about.title', 'Sobre o Aplicativo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate">
              <p>
                <span className="font-medium text-ink">{t('settings.about.version', 'Versão')}:</span> 1.0.0
              </p>
              <p>
                <span className="font-medium text-ink">{t('settings.about.developedBy', 'Desenvolvido por')}:</span> Assist Team
              </p>
              <p className="text-xs text-slate/70 mt-4">
                {t('settings.about.copyright', '© 2024 Assist. Todos os direitos reservados.')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logout Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          title={t('logoutConfirm.title', 'Deseja realmente sair?')}
          description={t('logoutConfirm.description', 'Você precisará fazer login novamente para acessar seus dados.')}
          cancelLabel={t('common.cancel', 'Cancelar')}
          confirmLabel={t('nav.logout', 'Sair')}
        />
      </div>
  );
}
