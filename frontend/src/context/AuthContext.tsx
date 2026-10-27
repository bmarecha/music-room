import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  getMe,
  type TokenResponse,
  type User,
} from '../api/auth';
import { setApiAccessToken, setOnUnauthorized } from '../api/client';
import { deleteToken, getToken, saveToken } from '../utils/storage';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailPending: boolean;
  establishSession: (data: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const establishSession = useCallback(async (data: TokenResponse) => {
    setApiAccessToken(data.access_token);
    await saveToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    setApiAccessToken(null);
    await deleteToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getMe();
      setUser(freshUser);
    } catch {
      await logout();
    }
  }, [logout]);

  // Initial token restoration
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setApiAccessToken(storedToken);
          setToken(storedToken);
          const currentUser = await getMe();
          setUser(currentUser);
        }
      } catch {
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    setOnUnauthorized(logout);
    initializeAuth();
  }, [logout]);

  const isAuthenticated = !!token && !!user;
  const isEmailPending = isAuthenticated && !user?.is_email_validated;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isEmailPending,
        establishSession,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
