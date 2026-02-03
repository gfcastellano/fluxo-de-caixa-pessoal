import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase/config';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Set language based on user's stored settings in Firestore
      if (user) {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../firebase/config');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userLanguage = userData.settings?.language;
            if (userLanguage) {
              // Extract language code (e.g., 'pt-BR' -> 'pt')
              const langCode = userLanguage.split('-')[0].toLowerCase();
              // Only change if it's a supported language
              if (['en', 'pt', 'es'].includes(langCode)) {
                i18n.changeLanguage(langCode);
              }
            }
          }
        } catch (error) {
          console.error('Error loading user language preference:', error);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [i18n]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
