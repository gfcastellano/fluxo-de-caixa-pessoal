import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUserSetup } from '../hooks/useUserSetup';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Input } from '../components/Input';
import { Chrome } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
          <p className="text-gray-500 mt-2">{t('auth.register.subtitle')}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4 mb-6">
            <Input
              type="number"
              label={t('auth.register.initialBalance')}
              placeholder={t('auth.register.initialBalancePlaceholder')}
              value={initialBalance || ''}
              onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
          </div>

          <Button
            onClick={handleGoogleSignUp}
            className="w-full"
            disabled={loading}
            variant="secondary"
          >
            <Chrome className="mr-2 h-5 w-5" />
            {loading ? t('auth.register.signingUp') : t('auth.register.signUpWithGoogle')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
