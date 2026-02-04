import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Chrome } from 'lucide-react';

export function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-neutral-100 px-4">
      <Card className="w-full max-w-md shadow-xl" hoverable>
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-3xl font-bold text-primary-600">F</span>
          </div>
          <CardTitle className="text-2xl text-neutral-900">Fluxo de Caixa Pessoal</CardTitle>
          <CardDescription className="mt-2">
            {t('auth.loginWithGoogle')}
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
          <Button
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={loading}
            variant="secondary"
            size="lg"
            leftIcon={<Chrome className="h-5 w-5" />}
          >
            {loading ? t('auth.loggingIn') : t('auth.loginWithGoogle')}
          </Button>
          
          <p className="mt-6 text-center text-sm text-neutral-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
