import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent auth during this phase
    const auth = localStorage.getItem('myrefinance_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (password: string) => {
    if (password === '12345') {
      setIsAuthenticated(true);
      localStorage.setItem('myrefinance_auth', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('myrefinance_auth');
  };

  if (loading) return null; // Prevent flicker before checking localStorage

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
