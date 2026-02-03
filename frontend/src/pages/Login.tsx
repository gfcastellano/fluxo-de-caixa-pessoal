import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Fluxo de Caixa Pessoal</CardTitle>
          <p className="text-gray-500 mt-2">{t('auth.loginWithGoogle')}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <Button
            onClick={handleGoogleLogin}
            className="w-full"
            disabled={loading}
            variant="secondary"
          >
            <Chrome className="mr-2 h-5 w-5" />
            {loading ? t('auth.loggingIn') : t('auth.loginWithGoogle')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
