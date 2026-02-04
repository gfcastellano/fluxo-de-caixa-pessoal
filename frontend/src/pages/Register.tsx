import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Input } from '../components/Input';
import { Chrome, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Register() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Initialize user setup hook with initial balance
  useUserSetup(initialBalance);

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-neutral-100 px-4 py-8">
      <Card className="w-full max-w-md shadow-xl" hoverable>
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-primary-600" />
          </div>
          <CardTitle className="text-2xl text-neutral-900">{t('auth.register.title')}</CardTitle>
          <CardDescription className="mt-2">
            {t('auth.register.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-6 text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="space-y-4 mb-6">
            <Input
              type="number"
              label={t('auth.register.initialBalance')}
              placeholder={t('auth.register.initialBalancePlaceholder')}
              value={initialBalance || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitialBalance(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              leftIcon={<span className="text-neutral-400 font-medium">$</span>}
            />
          </div>

          <Button
            onClick={handleGoogleSignUp}
            className="w-full"
            disabled={loading}
            variant="secondary"
            size="lg"
            leftIcon={<Chrome className="h-5 w-5" />}
          >
            {loading ? t('auth.register.signingUp') : t('auth.register.signUpWithGoogle')}
          </Button>
          
          <p className="mt-6 text-center text-sm text-neutral-500">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
